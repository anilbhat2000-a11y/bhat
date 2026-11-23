"""Organizations, location hierarchy, users, alert contacts and change approvals."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import changes, notify
from ..audit import audit
from ..db import get_db
from ..models import (LOCATION_KINDS, NVR, ROLES, SEVERITIES, AlertContact, Camera, ChangeRequest, NotificationLog,
                      Organization, User, Location)
from ..security import (allowed_location_ids, can_assign_role, check_location, covers, descendants, hash_password,
                        location_path, location_tree, require, scope_filter)
from .serializers import iso, user_dict

router = APIRouter(prefix="/api", tags=["organization"])


def _404():
    raise HTTPException(404, "Not found")


def _org_guard(user: User, org_id: int) -> None:
    if user.role != "super_admin" and user.org_id != org_id:
        raise HTTPException(404, "Not found")


# --------------------------------------------------------- organizations ----
class OrgIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str = Field(min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_-]+$")
    require_approval: bool = False
    active: bool = True
    corporate_office: str = Field("Corporate Office", max_length=120)


def org_dict(o: Organization, counts: dict | None = None) -> dict:
    return {"id": o.id, "name": o.name, "code": o.code, "active": o.active, "require_approval": o.require_approval,
            "created_at": iso(o.created_at), **(counts or {})}


@router.get("/orgs")
def list_orgs(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    q = select(Organization).order_by(Organization.name)
    if user.role != "super_admin":
        q = q.where(Organization.id == (user.org_id or -1))
    out = []
    for o in db.scalars(q):
        locs = select(Location.id).where(Location.org_id == o.id)
        out.append(org_dict(o, {
            "locations": db.scalar(select(func.count()).select_from(Location).where(Location.org_id == o.id)),
            "cameras": db.scalar(select(func.count()).select_from(Camera).where(Camera.location_id.in_(locs))),
            "nvrs": db.scalar(select(func.count()).select_from(NVR).where(NVR.location_id.in_(locs))),
            "users": db.scalar(select(func.count()).select_from(User).where(User.org_id == o.id))}))
    return out


@router.post("/orgs", status_code=201)
def create_org(body: OrgIn, request: Request, user: User = Depends(require("manage_orgs")), db: Session = Depends(get_db)):
    o = Organization(name=body.name, code=body.code.upper(), require_approval=body.require_approval, active=body.active)
    db.add(o)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "An organization with that name or code already exists")
    # Every organization starts with its top-level corporate office.
    db.add(Location(org_id=o.id, parent_id=None, kind="corporate", name=body.corporate_office or "Corporate Office"))
    audit(db, user.username, "org_created", o.name, request=request, org_id=o.id)
    return org_dict(o)


class OrgPatch(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=160)
    require_approval: bool | None = None
    active: bool | None = None


@router.patch("/orgs/{org_id}")
def update_org(org_id: int, body: OrgPatch, request: Request, user: User = Depends(require("manage_users")),
               db: Session = Depends(get_db)):
    o = db.get(Organization, org_id) or _404()
    _org_guard(user, org_id)
    if user.role not in ("super_admin", "org_admin"):
        raise HTTPException(403, "Only an org admin can change organization settings")
    if body.active is not None and user.role != "super_admin":
        raise HTTPException(403, "Only the platform admin can activate or deactivate an organization")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(o, k, v)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "Name already used")
    audit(db, user.username, "org_updated", o.name, body.model_dump(exclude_none=True), request=request, org_id=o.id)
    return org_dict(o)


# ------------------------------------------------------------- locations ----
class LocationIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: str = "branch"
    parent_id: int | None = None
    org_id: int | None = None  # only used by the platform admin for a new top-level location
    code: str = Field("", max_length=40)
    city: str = Field("", max_length=120)
    address: str = Field("", max_length=255)


@router.get("/locations")
def list_locations(user: User = Depends(require("view")), db: Session = Depends(get_db), org_id: int | None = None):
    """Locations the caller can see, each with its full path, depth and device counts,
    sorted so that a tree reads top to bottom."""
    ids = allowed_location_ids(db, user)
    q = select(Location)
    if ids is not None:
        q = q.where(Location.id.in_(ids or {-1}))
    if org_id:
        q = q.where(Location.org_id == org_id)
    locs = db.scalars(q).all()
    cams = dict(db.execute(select(Camera.location_id, func.count()).group_by(Camera.location_id)).all())
    nvrs = dict(db.execute(select(NVR.location_id, func.count()).group_by(NVR.location_id)).all())
    contacts = dict(db.execute(select(AlertContact.location_id, func.count()).group_by(AlertContact.location_id)).all())
    trees: dict[int, dict] = {}
    out = []
    for loc in locs:
        tree = trees.setdefault(loc.org_id, location_tree(db, loc.org_id))
        path = location_path(tree, loc.id)
        out.append({"id": loc.id, "org_id": loc.org_id, "org": loc.org.name, "parent_id": loc.parent_id,
                    "kind": loc.kind, "name": loc.name, "code": loc.code, "city": loc.city, "address": loc.address,
                    "path": path, "depth": path.count(" / "), "cameras": cams.get(loc.id, 0),
                    "nvrs": nvrs.get(loc.id, 0), "contacts": contacts.get(loc.id, 0),
                    "can_manage": _can_manage_location(db, user, loc)})
    out.sort(key=lambda r: (r["org"].lower(), r["path"].lower()))
    return out


def _can_manage_location(db: Session, user: User, loc: Location) -> bool:
    if user.role == "super_admin":
        return True
    if user.role == "org_admin":
        return user.org_id == loc.org_id
    if user.role == "location_admin":
        return covers(db, user, loc.id)
    return False


def _check_kind(kind: str):
    if kind not in LOCATION_KINDS:
        raise HTTPException(422, f"kind must be one of {', '.join(LOCATION_KINDS)}")


@router.post("/locations", status_code=201)
def create_location(body: LocationIn, request: Request, user: User = Depends(require("manage_locations")),
                    db: Session = Depends(get_db)):
    _check_kind(body.kind)
    if body.parent_id is not None:
        parent = db.get(Location, body.parent_id) or _404()
        check_location(db, user, parent.id)
        org_id = parent.org_id
    else:
        # Top-level location: org admins add them in their own org, the platform admin anywhere.
        if user.role == "super_admin":
            if not body.org_id or not db.get(Organization, body.org_id):
                raise HTTPException(422, "org_id is required for a top-level location")
            org_id = body.org_id
        elif user.role == "org_admin":
            org_id = user.org_id
        else:
            raise HTTPException(403, "Choose a parent location you manage")
    loc = Location(org_id=org_id, parent_id=body.parent_id, kind=body.kind, name=body.name.strip(), code=body.code.strip(),
                   city=body.city, address=body.address)
    db.add(loc)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "A location with that name already exists at this level")
    user._scope_cache = "unset"
    audit(db, user.username, "location_created", body.name, {"kind": body.kind, "parent_id": body.parent_id},
          request=request, org_id=org_id)
    return {"id": loc.id, "org_id": org_id, **body.model_dump(exclude={"org_id"})}


@router.patch("/locations/{loc_id}")
def update_location(loc_id: int, body: LocationIn, request: Request, user: User = Depends(require("manage_locations")),
                    db: Session = Depends(get_db)):
    loc = db.get(Location, loc_id) or _404()
    check_location(db, user, loc.id)
    _check_kind(body.kind)
    if body.parent_id != loc.parent_id:
        if body.parent_id is None:
            if user.role not in ("super_admin", "org_admin"):
                raise HTTPException(403, "Only an org admin can make a top-level location")
        else:
            parent = db.get(Location, body.parent_id) or _404()
            check_location(db, user, parent.id)
            if parent.org_id != loc.org_id:
                raise HTTPException(422, "A location cannot move to another organization")
            if parent.id in descendants(location_tree(db, loc.org_id), {loc.id}):
                raise HTTPException(422, "A location cannot be moved under itself")
        if user.role == "location_admin" and loc.id in {l.id for l in user.locations}:
            raise HTTPException(403, "You cannot move the location you are assigned to")
    loc.name, loc.kind, loc.parent_id = body.name.strip(), body.kind, body.parent_id
    loc.code, loc.city, loc.address = body.code.strip(), body.city, body.address
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "A location with that name already exists at this level")
    audit(db, user.username, "location_updated", loc.name, request=request, org_id=loc.org_id)
    return {"id": loc.id, "org_id": loc.org_id, **body.model_dump(exclude={"org_id"})}


@router.delete("/locations/{loc_id}")
def delete_location(loc_id: int, request: Request, user: User = Depends(require("manage_locations")),
                    db: Session = Depends(get_db)):
    loc = db.get(Location, loc_id) or _404()
    check_location(db, user, loc.id)
    if user.role == "location_admin" and loc.id in {l.id for l in user.locations}:
        raise HTTPException(403, "You cannot delete the location you are assigned to")
    if db.scalar(select(func.count()).select_from(Location).where(Location.parent_id == loc.id)):
        raise HTTPException(409, "Remove or move the locations under it first")
    if db.scalar(select(func.count()).select_from(Camera).where(Camera.location_id == loc.id)) or \
       db.scalar(select(func.count()).select_from(NVR).where(NVR.location_id == loc.id)):
        raise HTTPException(409, "Location still has cameras or NVRs")
    db.delete(loc)
    audit(db, user.username, "location_deleted", loc.name, request=request, org_id=loc.org_id)
    return {"ok": True}


# ------------------------------------------------------------------ users ----
class UserIn(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_.@-]+$")
    full_name: str = ""
    designation: str = ""
    role: str = "viewer"
    org_id: int | None = None
    password: str | None = None
    location_ids: list[int] = []
    active: bool = True


def _paths_for(db: Session, users: list[User]) -> dict[int, str]:
    out = {}
    for org_id in {u.org_id for u in users if u.org_id}:
        tree = location_tree(db, org_id)
        out.update({lid: location_path(tree, lid) for lid in tree})
    return out


def _visible_users(db: Session, actor: User) -> list[User]:
    q = select(User).order_by(User.username)
    if actor.role == "super_admin":
        return list(db.scalars(q))
    users = db.scalars(q.where(User.org_id == actor.org_id)).all()
    if actor.role == "org_admin":
        return list(users)
    scope = allowed_location_ids(db, actor) or set()
    # Location admins see users below them whose assigned locations are all inside their scope.
    return [u for u in users if u.id == actor.id or
            (can_assign_role(actor, u.role) and u.locations and all(l.id in scope for l in u.locations))]


@router.get("/users")
def list_users(user: User = Depends(require("manage_users")), db: Session = Depends(get_db)):
    users = _visible_users(db, user)
    paths = _paths_for(db, users)
    return [user_dict(u, paths) for u in users]


def _apply_user(db: Session, actor: User, u: User, body: UserIn):
    if body.role not in ROLES:
        raise HTTPException(422, f"role must be one of {ROLES}")
    if not can_assign_role(actor, body.role):
        raise HTTPException(403, "You can only give roles below your own")
    if body.password is not None and len(body.password) < 10:
        raise HTTPException(422, "Password must be at least 10 characters")
    org_id = body.org_id if actor.role == "super_admin" else actor.org_id
    if body.role == "super_admin":
        org_id = None
    elif org_id is None and body.role != "auditor":
        raise HTTPException(422, "Choose an organization for this user")
    if org_id is not None and not db.get(Organization, org_id):
        raise HTTPException(422, "Unknown organization")
    locs = db.scalars(select(Location).where(Location.id.in_(body.location_ids))).all() if body.location_ids else []
    if len(locs) != len(set(body.location_ids)):
        raise HTTPException(422, "Unknown location")
    for loc in locs:
        if loc.org_id != org_id:
            raise HTTPException(422, f"{loc.name} belongs to another organization")
        check_location(db, actor, loc.id)
    if body.role in ("location_admin", "operator", "viewer") and not locs:
        raise HTTPException(422, "Assign at least one location (access covers everything under it)")
    u.full_name, u.designation, u.role, u.active, u.org_id = body.full_name, body.designation, body.role, body.active, org_id
    u.locations = list(locs) if body.role in ("location_admin", "operator", "viewer") else []
    if body.password:
        u.password_hash = hash_password(body.password)


@router.post("/users", status_code=201)
def create_user(body: UserIn, request: Request, user: User = Depends(require("manage_users")), db: Session = Depends(get_db)):
    if not body.password:
        raise HTTPException(422, "Password is required")
    u = User(username=body.username, password_hash="")
    _apply_user(db, user, u, body)
    db.add(u)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "Username already exists")
    audit(db, user.username, "user_created", u.username, {"role": u.role}, request=request, org_id=u.org_id)
    return user_dict(u, _paths_for(db, [u]))


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: UserIn, request: Request, user: User = Depends(require("manage_users")),
                db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u or u not in _visible_users(db, user):
        raise HTTPException(404, "Not found")
    if u.id == user.id:
        if body.role != user.role or not body.active:
            raise HTTPException(422, "You cannot change your own role or disable your own account")
        # Keep own locations unchanged (cannot widen own access).
        body.location_ids = [l.id for l in u.locations]
        body.org_id = u.org_id
        if user.role != "super_admin":
            u.full_name, u.designation = body.full_name, body.designation
            if body.password:
                if len(body.password) < 10:
                    raise HTTPException(422, "Password must be at least 10 characters")
                u.password_hash = hash_password(body.password)
            audit(db, user.username, "user_updated", u.username, request=request, org_id=u.org_id)
            return user_dict(u, _paths_for(db, [u]))
    elif not can_assign_role(user, u.role):
        raise HTTPException(403, "You can only manage users below your own role")
    _apply_user(db, user, u, body)
    audit(db, user.username, "user_updated", u.username, {"role": u.role, "active": u.active}, request=request, org_id=u.org_id)
    return user_dict(u, _paths_for(db, [u]))


# --------------------------------------------------------- alert contacts ----
class ContactIn(BaseModel):
    location_id: int
    name: str = Field(min_length=1, max_length=120)
    designation: str = Field("", max_length=120)
    phone: str = ""
    email: str = ""
    notify_email: bool = True
    notify_sms: bool = False
    min_severity: str = "warning"
    device_types: list[str] = ["camera", "nvr"]
    escalation_delay_min: int = Field(0, ge=0, le=7 * 24 * 60)
    active: bool = True


def contact_dict(c: AlertContact, path: str = "") -> dict:
    return {"id": c.id, "location_id": c.location_id, "location_path": path or c.location.name, "name": c.name,
            "designation": c.designation, "phone": c.phone, "email": c.email, "notify_email": c.notify_email,
            "notify_sms": c.notify_sms, "min_severity": c.min_severity, "device_types": c.device_types,
            "escalation_delay_min": c.escalation_delay_min, "active": c.active, "org_id": c.location.org_id}


def _validate_contact(db: Session, user: User, body: ContactIn) -> ContactIn:
    check_location(db, user, body.location_id)
    body.phone = notify.normalize_phone(body.phone)
    body.email = body.email.strip()
    if body.phone and not notify.PHONE_RE.match(body.phone):
        raise HTTPException(422, "Phone must be 8–15 digits, with country code, e.g. +919876543210")
    if body.email and not notify.EMAIL_RE.match(body.email):
        raise HTTPException(422, "Email address is not valid")
    if not body.phone and not body.email:
        raise HTTPException(422, "Give at least a phone number or an email address")
    if body.notify_sms and not body.phone:
        raise HTTPException(422, "SMS needs a phone number")
    if body.notify_email and not body.email:
        raise HTTPException(422, "Email alerts need an email address")
    if body.min_severity not in SEVERITIES:
        raise HTTPException(422, f"min_severity must be one of {SEVERITIES}")
    if not body.device_types or any(t not in ("camera", "nvr") for t in body.device_types):
        raise HTTPException(422, "device_types must contain camera and/or nvr")
    return body


@router.get("/contacts")
def list_contacts(user: User = Depends(require("view")), db: Session = Depends(get_db), location_id: int | None = None):
    q = scope_filter(db, select(AlertContact), AlertContact.location_id, user)
    if location_id:
        q = q.where(AlertContact.location_id == location_id)
    contacts = db.scalars(q).all()
    trees: dict[int, dict] = {}
    out = []
    for c in contacts:
        tree = trees.setdefault(c.location.org_id, location_tree(db, c.location.org_id))
        out.append(contact_dict(c, location_path(tree, c.location_id)))
    out.sort(key=lambda r: (r["location_path"].lower(), r["escalation_delay_min"], r["name"].lower()))
    return out


@router.post("/contacts", status_code=201)
def create_contact(body: ContactIn, request: Request, user: User = Depends(require("manage_contacts")),
                   db: Session = Depends(get_db)):
    body = _validate_contact(db, user, body)
    c = AlertContact(**body.model_dump())
    db.add(c)
    db.flush()
    audit(db, user.username, "contact_created", f"{c.name} ({c.designation})", request=request, org_id=c.location.org_id)
    return contact_dict(c)


@router.patch("/contacts/{contact_id}")
def update_contact(contact_id: int, body: ContactIn, request: Request, user: User = Depends(require("manage_contacts")),
                   db: Session = Depends(get_db)):
    c = db.get(AlertContact, contact_id) or _404()
    check_location(db, user, c.location_id)
    body = _validate_contact(db, user, body)
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    audit(db, user.username, "contact_updated", c.name, request=request, org_id=c.location.org_id)
    return contact_dict(c)


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, request: Request, user: User = Depends(require("manage_contacts")),
                   db: Session = Depends(get_db)):
    c = db.get(AlertContact, contact_id) or _404()
    check_location(db, user, c.location_id)
    db.delete(c)
    audit(db, user.username, "contact_deleted", c.name, request=request, org_id=c.location.org_id)
    return {"ok": True}


@router.post("/contacts/{contact_id}/test")
def test_contact(contact_id: int, request: Request, user: User = Depends(require("manage_contacts")),
                 db: Session = Depends(get_db)):
    c = db.get(AlertContact, contact_id) or _404()
    check_location(db, user, c.location_id)
    tree = location_tree(db, c.location.org_id)
    path = location_path(tree, c.location_id)
    results = notify.deliver(db, c, None, "3C ITS VisionOps test notification",
                             f"This is a test from 3C ITS VisionOps for {c.name} ({c.designation}) at {path}.\n"
                             "If you received it, alerts for this location will reach you.",
                             f"3C ITS VisionOps test: alerts for {path} will reach this number.")
    audit(db, user.username, "contact_tested", c.name, {"results": results}, request=request, org_id=c.location.org_id)
    return {"results": results}


@router.get("/notifications")
def list_notifications(user: User = Depends(require("view")), db: Session = Depends(get_db),
                       limit: int = Query(200, le=1000)):
    q = scope_filter(db, select(NotificationLog).order_by(NotificationLog.ts.desc()), NotificationLog.location_id, user)
    rows = db.scalars(q.limit(limit)).all()
    names = {c.id: (c.name, c.designation) for c in db.scalars(select(AlertContact).where(
        AlertContact.id.in_({r.contact_id for r in rows if r.contact_id})))}
    return [{"id": r.id, "ts": iso(r.ts), "alert_id": r.alert_id, "contact": names.get(r.contact_id, ("(deleted)", ""))[0],
             "designation": names.get(r.contact_id, ("", ""))[1], "channel": r.channel, "target": r.target,
             "status": r.status, "error": r.error} for r in rows]


# ------------------------------------------------------------- approvals ----
def cr_dict(cr: ChangeRequest, can_decide: bool = False, path: str = "") -> dict:
    payload = {k: v for k, v in cr.payload.items() if k not in ("password_enc", "csv_enc", "requester_id")}
    return {"id": cr.id, "org_id": cr.org_id, "location_id": cr.location_id, "location_path": path,
            "entity": cr.entity, "action": cr.action, "entity_id": cr.entity_id, "summary": cr.summary,
            "payload": payload, "requested_by": cr.requested_by, "requested_at": iso(cr.requested_at),
            "status": cr.status, "decided_by": cr.decided_by, "decided_at": iso(cr.decided_at),
            "decision_note": cr.decision_note, "result": cr.result, "can_decide": can_decide}


@router.get("/approvals")
def list_approvals(user: User = Depends(require("view")), db: Session = Depends(get_db), status: str = "pending"):
    q = select(ChangeRequest).order_by(ChangeRequest.requested_at.desc()).limit(300)
    if user.role != "super_admin":
        q = q.where(ChangeRequest.org_id == (user.org_id or -1))
    if status != "all":
        q = q.where(ChangeRequest.status == status)
    trees: dict[int, dict] = {}
    out = []
    for cr in db.scalars(q):
        decide_ok = changes.can_approve(db, user, cr)[0]
        mine = cr.requested_by_id == user.id
        if not (decide_ok or mine or user.role in ("super_admin", "org_admin", "auditor")
                or covers(db, user, cr.location_id)):
            continue
        tree = trees.setdefault(cr.org_id, location_tree(db, cr.org_id))
        out.append(cr_dict(cr, decide_ok, location_path(tree, cr.location_id) if cr.location_id in tree else ""))
    return out


class DecisionIn(BaseModel):
    approve: bool
    note: str = Field("", max_length=500)


@router.post("/approvals/{cr_id}/decide")
def decide_approval(cr_id: int, body: DecisionIn, request: Request, user: User = Depends(require("approve")),
                    db: Session = Depends(get_db)):
    cr = db.get(ChangeRequest, cr_id) or _404()
    _org_guard(user, cr.org_id)
    res = changes.decide(db, user, cr, body.approve, body.note, request)
    return {**res, "request": cr_dict(db.get(ChangeRequest, cr_id))}
