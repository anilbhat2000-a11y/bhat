"""Device changes with optional approval (maker-checker).

When an organization has `require_approval` on, changes made by location
admins are stored as ChangeRequests and applied only after approval by someone
higher in that organization's hierarchy:
  * an org admin of the organization (or a platform super admin), or
  * a location admin assigned to a location strictly ABOVE the requester's
    assigned location that covers the change.
Nobody can approve their own request. Org admins and super admins apply changes directly.
"""
from __future__ import annotations

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import onboarding
from .audit import audit
from .models import NVR, Alert, Camera, ChangeRequest, DeviceState, Location, User, utcnow
from .security import allowed_location_ids, ancestors, can, decrypt_secret, location_tree

DIRECT_ROLES = {"super_admin", "org_admin"}
CAMERA_FIELDS = {"name", "location_id", "nvr_id", "channel", "vendor", "model", "host", "onvif_port", "rtsp_url",
                 "sub_stream_url", "username", "power_type", "driver", "building", "floor", "zone", "tags",
                 "target_fps", "enabled", "password_enc", "department"}
NVR_FIELDS = {"name", "location_id", "vendor", "model", "host", "http_port", "rtsp_port", "username", "channels",
              "driver", "enabled", "password_enc", "department"}


def org_of(db: Session, location_id: int):
    loc = db.get(Location, location_id)
    if loc is None:
        raise HTTPException(422, "Unknown location")
    return loc.org


def needs_approval(db: Session, user: User, location_ids: list[int]) -> bool:
    if user.role in DIRECT_ROLES:
        return False
    return any(org_of(db, lid).require_approval for lid in location_ids)


def _drop_state(db: Session, device_type: str, device_id: int) -> None:
    st = db.get(DeviceState, (device_type, device_id))
    if st:
        db.delete(st)


def apply(db: Session, entity: str, action: str, entity_id: int | None, payload: dict) -> dict:
    """Perform the change. Flushes but does not commit."""
    try:
        if entity in ("camera", "nvr"):
            model, fields, dtype = (Camera, CAMERA_FIELDS, "camera") if entity == "camera" else (NVR, NVR_FIELDS, "nvr")
            data = {k: v for k, v in payload.items() if k in fields}
            if action == "create":
                obj = model(**data)
                db.add(obj)
                db.flush()
                return {"id": obj.id, "name": obj.name}
            obj = db.get(model, entity_id)
            if obj is None:
                raise HTTPException(404, f"{entity} no longer exists")
            if action == "update":
                for k, v in data.items():
                    setattr(obj, k, v)
                if data.get("enabled") is False:
                    # Deactivated devices are not polled: close their open alerts.
                    for a in db.scalars(select(Alert).where(Alert.device_type == dtype, Alert.device_id == obj.id,
                                                            Alert.status != "resolved")):
                        a.status, a.resolved_at = "resolved", utcnow()
                db.flush()
                return {"id": obj.id, "name": obj.name}
            if action == "delete":
                _drop_state(db, dtype, obj.id)
                db.delete(obj)
                db.flush()
                return {"id": entity_id, "name": obj.name, "deleted": True}
        if entity == "nvr_channels":
            nvr = db.get(NVR, entity_id)
            if nvr is None:
                raise HTTPException(404, "NVR no longer exists")
            created = onboarding.import_nvr_channels(db, nvr, payload.get("channels"), payload.get("main_template", ""),
                                                     payload.get("sub_template", ""), payload.get("driver", "generic"))
            return {"created": len(created), "camera_ids": [c.id for c in created]}
        if entity == "camera_csv":
            requester = db.get(User, payload["requester_id"])
            scope = allowed_location_ids(db, requester) if requester else set()
            res = onboarding.import_csv(db, decrypt_secret(payload["csv_enc"]), scope)
            if res["errors"]:
                raise HTTPException(422, {"errors": res["errors"]})
            return res
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Conflicts with an existing record (for example, that NVR channel already has a camera)")
    raise HTTPException(400, f"unsupported change {entity}/{action}")


def submit(db: Session, user: User, entity: str, action: str, location_ids: list[int], payload: dict,
           summary: str, entity_id: int | None = None, request: Request | None = None) -> dict:
    """Apply now, or queue for approval. Commits."""
    location_ids = sorted(set(location_ids))
    if needs_approval(db, user, location_ids):
        cr = ChangeRequest(org_id=org_of(db, location_ids[0]).id, location_id=location_ids[0], entity=entity,
                           action=action, entity_id=entity_id, summary=summary[:300],
                           payload={**payload, "location_ids": location_ids}, requested_by_id=user.id,
                           requested_by=user.username)
        db.add(cr)
        db.flush()
        audit(db, user.username, "change_requested", summary[:120], {"request_id": cr.id}, request=request, org_id=cr.org_id)
        return {"pending_approval": True, "request_id": cr.id, "message": "Sent for approval"}
    result = apply(db, entity, action, entity_id, payload)
    audit(db, user.username, f"{entity}_{action}", summary[:120], result if len(str(result)) < 500 else {},
          request=request, org_id=org_of(db, location_ids[0]).id if location_ids else None)
    return {"pending_approval": False, **result}


def can_approve(db: Session, approver: User, cr: ChangeRequest) -> tuple[bool, str]:
    if cr.status != "pending":
        return False, "request is not pending"
    if approver.id == cr.requested_by_id:
        return False, "you cannot approve your own request"
    if not can(approver, "approve"):
        return False, "your role cannot approve changes"
    if approver.role == "super_admin":
        return True, ""
    if approver.org_id != cr.org_id:
        return False, "request belongs to another organization"
    if approver.role == "org_admin":
        return True, ""
    requester = db.get(User, cr.requested_by_id)
    tree = location_tree(db, cr.org_id)
    req_nodes = {loc.id for loc in (requester.locations if requester else [])}
    mine = {loc.id for loc in approver.locations if loc.org_id == cr.org_id}
    for target in cr.payload.get("location_ids", [cr.location_id]):
        chain = ancestors(tree, target)  # target, parent, ... root
        req_node = next((n for n in chain if n in req_nodes), None)
        if req_node is None:
            return False, "only an org admin can approve this request"
        above = ancestors(tree, req_node)[1:]  # strictly above the requester's node
        if not mine.intersection(above):
            return False, "approval must come from a level above the requester"
    return True, ""


def decide(db: Session, approver: User, cr: ChangeRequest, approve: bool, note: str, request: Request | None = None) -> dict:
    ok, why = can_approve(db, approver, cr)
    if not ok:
        raise HTTPException(403, why)
    cr.decided_by, cr.decided_at, cr.decision_note = approver.username, utcnow(), note
    if not approve:
        cr.status = "rejected"
        audit(db, approver.username, "change_rejected", cr.summary[:120], {"request_id": cr.id}, request=request, org_id=cr.org_id)
        return {"status": "rejected"}
    try:
        result = apply(db, cr.entity, cr.action, cr.entity_id, cr.payload)
        cr.status, cr.result = "approved", result
    except HTTPException as e:
        db.rollback()
        cr = db.get(ChangeRequest, cr.id)
        cr.decided_by, cr.decided_at, cr.decision_note = approver.username, utcnow(), note
        cr.status, cr.result = "failed", {"error": e.detail}
    audit(db, approver.username, f"change_{cr.status}", cr.summary[:120], {"request_id": cr.id}, request=request, org_id=cr.org_id)
    return {"status": cr.status, "result": cr.result}


def pending_for(db: Session, user: User) -> list[ChangeRequest]:
    q = select(ChangeRequest).where(ChangeRequest.status == "pending").order_by(ChangeRequest.requested_at)
    if user.role != "super_admin":
        q = q.where(ChangeRequest.org_id == (user.org_id or -1))
    return [cr for cr in db.scalars(q) if can_approve(db, user, cr)[0]]
