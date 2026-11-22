"""Cameras, NVRs, bulk onboarding and on-demand health checks.

Every read is limited to the caller's location scope. Every change goes through
changes.submit(), which applies it directly or queues it for approval.
"""
from __future__ import annotations

import csv
import io
from datetime import timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import changes, onboarding
from ..analytics.engine import validate_rule_config
from ..audit import audit
from ..db import get_db
from ..health import collector, drivers, maintenance
from ..models import NVR, POWER_TYPES, Camera, DeviceState, HealthMetric, Location, User, utcnow
from ..security import (allowed_location_ids, check_location, encrypt_secret, location_path, location_tree, require,
                        scope_filter)
from .serializers import camera_dict, nvr_dict

router = APIRouter(prefix="/api", tags=["devices"])


def _states(db: Session, device_type: str, ids: list[int]) -> dict[int, DeviceState]:
    if not ids:
        return {}
    rows = db.scalars(select(DeviceState).where(DeviceState.device_type == device_type, DeviceState.device_id.in_(ids)))
    return {s.device_id: s for s in rows}


def _paths(db: Session, location_ids: set[int]) -> dict[int, str]:
    out: dict[int, str] = {}
    orgs = {o for (o,) in db.execute(select(Location.org_id).where(Location.id.in_(location_ids or {-1})))}
    for org_id in orgs:
        tree = location_tree(db, org_id)
        out.update({lid: location_path(tree, lid) for lid in location_ids if lid in tree})
    return out


def _404():
    raise HTTPException(404, "Not found")


def _respond(res: dict, ok_payload):
    """Pending changes return 202 with the request id; applied ones return the object."""
    if res.get("pending_approval"):
        from fastapi.responses import JSONResponse
        return JSONResponse(res, status_code=202)
    return ok_payload()


# --------------------------------------------------------------- cameras ----
class CameraIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location_id: int
    nvr_id: int | None = None
    channel: int | None = None
    vendor: str = "generic"
    model: str = ""
    host: str = ""
    onvif_port: int = 80
    rtsp_url: str = ""
    sub_stream_url: str = ""
    username: str = ""
    password: str | None = None  # None = keep existing
    power_type: str = "poe"
    driver: str = "generic"
    building: str = ""
    floor: str = ""
    zone: str = ""
    tags: list[str] = []
    target_fps: float = 25
    department: str = Field("", max_length=80)
    enabled: bool = True

    def payload(self) -> dict:
        d = self.model_dump(exclude={"password"})
        if self.password is not None:
            d["password_enc"] = encrypt_secret(self.password)
        return d


def _validate_camera(body: CameraIn, db: Session, user: User) -> None:
    check_location(db, user, body.location_id)
    if body.power_type not in POWER_TYPES:
        raise HTTPException(422, f"power_type must be one of {POWER_TYPES}")
    if body.driver not in drivers.CAMERA_DRIVERS:
        raise HTTPException(422, f"driver must be one of {sorted(drivers.CAMERA_DRIVERS)}")
    for u in (body.rtsp_url, body.sub_stream_url):
        if u and not u.startswith("rtsp://"):
            raise HTTPException(422, "Stream URLs must start with rtsp://")
    if not body.rtsp_url and not body.host:
        raise HTTPException(422, "rtsp_url or host is required")
    if body.nvr_id is not None:
        nvr = db.get(NVR, body.nvr_id)
        if not nvr or nvr.location.org_id != db.get(Location, body.location_id).org_id:
            raise HTTPException(422, "NVR must exist and belong to the same organization")
        check_location(db, user, nvr.location_id)


@router.get("/cameras")
def list_cameras(user: User = Depends(require("view")), db: Session = Depends(get_db),
                 location_id: int | None = None, status: str | None = None, power_type: str | None = None,
                 q: str | None = None, nvr_id: int | None = None, org_id: int | None = None):
    query = scope_filter(db, select(Camera).order_by(Camera.location_id, Camera.name), Camera.location_id, user)
    if location_id:
        # A location filter includes everything under that location.
        check_location(db, user, location_id)
        from ..security import descendants
        loc = db.get(Location, location_id)
        query = query.where(Camera.location_id.in_(descendants(location_tree(db, loc.org_id), {location_id})))
    if org_id:
        query = query.where(Camera.location_id.in_(select(Location.id).where(Location.org_id == org_id)))
    if nvr_id:
        query = query.where(Camera.nvr_id == nvr_id)
    if power_type:
        query = query.where(Camera.power_type == power_type)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(func.lower(Camera.name).like(like) | func.lower(Camera.zone).like(like) |
                            func.lower(Camera.host).like(like))
    cams = db.scalars(query).all()
    states = _states(db, "camera", [c.id for c in cams])
    paths = _paths(db, {c.location_id for c in cams})
    out = [camera_dict(c, states.get(c.id), paths.get(c.location_id, "")) for c in cams]
    if status:
        out = [c for c in out if c["health"]["status"] == status]
    return out


@router.get("/cameras/export.csv", response_class=PlainTextResponse)
def export_cameras(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    rows = list_cameras(user=user, db=db)
    buf = io.StringIO()
    w = csv.writer(buf)
    cols = ["id", "name", "organization", "location", "nvr", "channel", "zone", "power_type", "status", "last_seen",
            "fps", "target_fps", "bitrate_kbps", "latency_ms", "battery_pct", "firmware", "error"]
    w.writerow(cols)
    for c in rows:
        h, d = c["health"], c["health"]["data"]
        w.writerow([c["id"], c["name"], c["org"], c["location_path"], c["nvr"] or "", c["channel"] or "", c["zone"],
                    c["power_type"], h["status"], h["last_seen"] or "", d.get("fps", ""), c["target_fps"],
                    d.get("bitrate_kbps", ""), d.get("latency_ms", ""), d.get("battery_pct", ""),
                    d.get("firmware", ""), h["error"]])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=cameras.csv"})


@router.get("/cameras/import/template", response_class=PlainTextResponse)
def camera_csv_template(user: User = Depends(require("manage_devices"))):
    return PlainTextResponse(onboarding.csv_template(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=camera_import_template.csv"})


@router.post("/cameras/import")
def import_cameras(request: Request, csv_text: str = Body(..., media_type="text/csv"), dry_run: bool = False,
                   user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    scope = allowed_location_ids(db, user)
    check = onboarding.import_csv(db, csv_text, scope, dry_run=True)
    if check["errors"] or dry_run:
        db.rollback()
        return check
    res = changes.submit(db, user, "camera_csv", "import", check["location_ids"],
                         {"csv_enc": encrypt_secret(csv_text), "requester_id": user.id},
                         f"Import {check['valid_rows']} cameras from CSV", request=request)
    return _respond(res, lambda: res)


@router.get("/cameras/{cam_id}")
def get_camera(cam_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_location(db, user, c.location_id)
    return camera_dict(c, db.get(DeviceState, ("camera", c.id)), _paths(db, {c.location_id}).get(c.location_id, ""))


@router.post("/cameras", status_code=201)
def create_camera(body: CameraIn, request: Request, user: User = Depends(require("manage_devices")),
                  db: Session = Depends(get_db)):
    _validate_camera(body, db, user)
    res = changes.submit(db, user, "camera", "create", [body.location_id], body.payload(),
                         f"Add camera {body.name}", request=request)
    return _respond(res, lambda: get_camera(res["id"], user, db))


@router.patch("/cameras/{cam_id}")
def update_camera(cam_id: int, body: CameraIn, request: Request, user: User = Depends(require("manage_devices")),
                  db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_location(db, user, c.location_id)
    _validate_camera(body, db, user)
    res = changes.submit(db, user, "camera", "update", [c.location_id, body.location_id], body.payload(),
                         f"Change camera {c.name}", entity_id=c.id, request=request)
    return _respond(res, lambda: get_camera(cam_id, user, db))


@router.delete("/cameras/{cam_id}")
def delete_camera(cam_id: int, request: Request, user: User = Depends(require("manage_devices")),
                  db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_location(db, user, c.location_id)
    res = changes.submit(db, user, "camera", "delete", [c.location_id], {}, f"Remove camera {c.name}",
                         entity_id=c.id, request=request)
    return _respond(res, lambda: {"ok": True})


@router.put("/cameras/{cam_id}/analytics")
def set_analytics(cam_id: int, request: Request, rules: list[dict] = Body(...),
                  user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_location(db, user, c.location_id)
    errs = {i: e for i, r in enumerate(rules) if (e := validate_rule_config(r))}
    if errs:
        raise HTTPException(422, {"errors": errs})
    c.analytics = rules
    audit(db, user.username, "camera_analytics_updated", c.name, {"count": len(rules)}, request=request, org_id=c.location.org_id)
    return {"ok": True, "analytics": rules}


@router.post("/cameras/{cam_id}/check")
def check_camera(cam_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_location(db, user, c.location_id)
    collector.store_reading(db, "camera", c, drivers.read_camera(c))
    db.commit()
    return get_camera(cam_id, user, db)


@router.post("/cameras/{cam_id}/reset-reference")
def reset_reference(cam_id: int, request: Request, user: User = Depends(require("manage_devices")),
                    db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_location(db, user, c.location_id)
    drivers.reset_reference_frame(c.id)
    audit(db, user.username, "camera_reference_reset", c.name, request=request, org_id=c.location.org_id)
    return {"ok": True}


@router.get("/metrics/{device_type}/{device_id}")
def metrics(device_type: str, device_id: int, keys: str = Query("online"), hours: int = Query(24, le=24 * 90),
            user: User = Depends(require("view")), db: Session = Depends(get_db)):
    model = {"camera": Camera, "nvr": NVR}.get(device_type) or _404()
    dev = db.get(model, device_id) or _404()
    check_location(db, user, dev.location_id)
    since = utcnow() - timedelta(hours=hours)
    out: dict[str, list] = {}
    for key in keys.split(",")[:8]:
        rows = db.execute(select(HealthMetric.ts, HealthMetric.value).where(
            HealthMetric.device_type == device_type, HealthMetric.device_id == device_id,
            HealthMetric.key == key, HealthMetric.ts >= since).order_by(HealthMetric.ts)).all()
        out[key] = [[ts.isoformat() + "Z", v] for ts, v in rows]
    return out


# ------------------------------------------------------------------ NVRs ----
class NvrIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location_id: int
    vendor: str = "generic"
    model: str = ""
    host: str = Field(min_length=1)
    http_port: int = 80
    rtsp_port: int = 554
    username: str = ""
    password: str | None = None
    channels: int = Field(16, ge=1, le=256)
    driver: str = "tcp"
    department: str = Field("", max_length=80)
    enabled: bool = True

    def payload(self) -> dict:
        d = self.model_dump(exclude={"password"})
        if self.password is not None:
            d["password_enc"] = encrypt_secret(self.password)
        return d


def _validate_nvr(body: NvrIn, db: Session, user: User):
    check_location(db, user, body.location_id)
    if body.driver not in drivers.NVR_DRIVERS:
        raise HTTPException(422, f"driver must be one of {sorted(drivers.NVR_DRIVERS)}")


@router.get("/nvrs")
def list_nvrs(user: User = Depends(require("view")), db: Session = Depends(get_db), location_id: int | None = None):
    q = scope_filter(db, select(NVR).order_by(NVR.location_id, NVR.name), NVR.location_id, user)
    if location_id:
        check_location(db, user, location_id)
        from ..security import descendants
        loc = db.get(Location, location_id)
        q = q.where(NVR.location_id.in_(descendants(location_tree(db, loc.org_id), {location_id})))
    nvrs = db.scalars(q).all()
    states = _states(db, "nvr", [n.id for n in nvrs])
    counts = dict(db.execute(select(Camera.nvr_id, func.count()).where(Camera.nvr_id.is_not(None)).group_by(Camera.nvr_id)).all())
    paths = _paths(db, {n.location_id for n in nvrs})
    return [nvr_dict(n, states.get(n.id), counts.get(n.id, 0), paths.get(n.location_id, "")) for n in nvrs]


@router.get("/nvrs/{nvr_id}")
def get_nvr(nvr_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_location(db, user, n.location_id)
    cnt = db.scalar(select(func.count()).select_from(Camera).where(Camera.nvr_id == n.id))
    return nvr_dict(n, db.get(DeviceState, ("nvr", n.id)), cnt or 0, _paths(db, {n.location_id}).get(n.location_id, ""))


@router.post("/nvrs", status_code=201)
def create_nvr(body: NvrIn, request: Request, user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    _validate_nvr(body, db, user)
    res = changes.submit(db, user, "nvr", "create", [body.location_id], body.payload(), f"Add NVR {body.name}",
                         request=request)
    return _respond(res, lambda: get_nvr(res["id"], user, db))


@router.patch("/nvrs/{nvr_id}")
def update_nvr(nvr_id: int, body: NvrIn, request: Request, user: User = Depends(require("manage_devices")),
               db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_location(db, user, n.location_id)
    _validate_nvr(body, db, user)
    res = changes.submit(db, user, "nvr", "update", [n.location_id, body.location_id], body.payload(),
                         f"Change NVR {n.name}", entity_id=n.id, request=request)
    return _respond(res, lambda: get_nvr(nvr_id, user, db))


@router.delete("/nvrs/{nvr_id}")
def delete_nvr(nvr_id: int, request: Request, user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_location(db, user, n.location_id)
    res = changes.submit(db, user, "nvr", "delete", [n.location_id], {}, f"Remove NVR {n.name}", entity_id=n.id,
                         request=request)
    return _respond(res, lambda: {"ok": True})


class ChannelImportIn(BaseModel):
    channels: list[int] | None = None
    main_template: str = ""
    sub_template: str = ""
    driver: str = "generic"


@router.post("/nvrs/{nvr_id}/import-channels")
def nvr_import_channels(nvr_id: int, body: ChannelImportIn, request: Request,
                        user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_location(db, user, n.location_id)
    if body.driver not in drivers.CAMERA_DRIVERS:
        raise HTTPException(422, "Unknown camera driver")
    if body.channels and any(ch < 1 or ch > n.channels for ch in body.channels):
        raise HTTPException(422, f"Channels must be between 1 and {n.channels}")
    try:
        onboarding.channel_urls(n.vendor, n.host, n.rtsp_port, 1, body.main_template, body.sub_template)
    except (ValueError, KeyError) as e:
        raise HTTPException(422, str(e))
    count = len(body.channels) if body.channels else n.channels
    res = changes.submit(db, user, "nvr_channels", "import", [n.location_id], body.model_dump(),
                         f"Import {count} channels from NVR {n.name}", entity_id=n.id, request=request)
    if res.get("pending_approval"):
        return _respond(res, None)
    cams = [db.get(Camera, cid) for cid in res["camera_ids"]]
    return {"created": res["created"], "cameras": [camera_dict(c) for c in cams]}


# ------------------------------------------- status, reboot, troubleshoot ----
class EnabledIn(BaseModel):
    enabled: bool


def _device(db: Session, user: User, kind: str, dev_id: int):
    model = {"camera": Camera, "nvr": NVR}.get(kind) or _404()
    dev = db.get(model, dev_id) or _404()
    check_location(db, user, dev.location_id)
    return dev


@router.post("/{kind}s/{dev_id}/enabled")
def set_enabled(kind: str, dev_id: int, body: EnabledIn, request: Request,
                user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    """Activate or deactivate a camera/NVR. Deactivated devices are not polled and raise no alerts."""
    dev = _device(db, user, kind, dev_id)
    verb = "Activate" if body.enabled else "Deactivate"
    res = changes.submit(db, user, kind, "update", [dev.location_id], {"enabled": body.enabled},
                         f"{verb} {kind.upper() if kind == 'nvr' else kind} {dev.name}", entity_id=dev.id, request=request)
    return _respond(res, lambda: {"ok": True, "enabled": body.enabled})


@router.post("/{kind}s/{dev_id}/reboot")
def reboot_device(kind: str, dev_id: int, request: Request, user: User = Depends(require("reboot")),
                  db: Session = Depends(get_db)):
    dev = _device(db, user, kind, dev_id)
    res = maintenance.reboot_camera(dev) if kind == "camera" else maintenance.reboot_nvr(dev)
    audit(db, user.username, f"{kind}_reboot", dev.name, {"ok": res.ok, "method": res.method, "message": res.message},
          request=request, org_id=dev.location.org_id)
    if not res.ok:
        raise HTTPException(502, f"Reboot failed ({res.method}): {res.message}")
    return {"ok": True, "method": res.method, "message": res.message}


@router.post("/{kind}s/{dev_id}/troubleshoot")
def troubleshoot_device(kind: str, dev_id: int, request: Request, user: User = Depends(require("troubleshoot")),
                        db: Session = Depends(get_db)):
    dev = _device(db, user, kind, dev_id)
    steps = maintenance.diagnose_camera(dev) if kind == "camera" else maintenance.diagnose_nvr(dev)
    # A troubleshoot run also refreshes the stored health and identity.
    reading = drivers.read_camera(dev) if kind == "camera" else drivers.read_nvr(dev)
    collector.store_reading(db, kind, dev, reading)
    db.commit()
    worst = "fail" if any(s["status"] == "fail" for s in steps) else "warn" if any(s["status"] == "warn" for s in steps) else "pass"
    audit(db, user.username, f"{kind}_troubleshoot", dev.name, {"result": worst}, request=request, org_id=dev.location.org_id)
    return {"result": worst, "steps": steps}


# ------------------------------------------------------------- discovery ----
@router.post("/discovery")
def run_discovery(request: Request, timeout: float = Query(3.0, ge=1, le=10), iface_ip: str = "",
                  user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    found = onboarding.discover(timeout, iface_ip)
    known = {h for (h,) in db.execute(scope_filter(db, select(Camera.host), Camera.location_id, user)).all() if h}
    for f in found:
        f["already_added"] = f.get("host") in known
    audit(db, user.username, "onvif_discovery", details={"found": len(found)}, request=request, org_id=user.org_id)
    return found
