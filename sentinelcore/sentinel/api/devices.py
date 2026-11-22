"""Sites, cameras, NVRs, bulk onboarding and on-demand health checks."""
from __future__ import annotations

import csv
import io
from datetime import timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import onboarding
from ..analytics.engine import validate_rule_config
from ..audit import audit
from ..db import get_db
from ..health import collector, drivers
from ..models import NVR, POWER_TYPES, Camera, DeviceState, HealthMetric, Site, User, utcnow
from ..security import allowed_site_ids, check_site, encrypt_secret, require, scope_filter
from .serializers import camera_dict, nvr_dict

router = APIRouter(prefix="/api", tags=["devices"])


def _states(db: Session, device_type: str, ids: list[int]) -> dict[int, DeviceState]:
    if not ids:
        return {}
    rows = db.scalars(select(DeviceState).where(DeviceState.device_type == device_type, DeviceState.device_id.in_(ids)))
    return {s.device_id: s for s in rows}


# ----------------------------------------------------------------- sites ----
class SiteIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    city: str = ""
    address: str = ""


@router.get("/sites")
def list_sites(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    q = scope_filter(select(Site).order_by(Site.name), Site.id, user)
    return [{"id": s.id, "name": s.name, "city": s.city, "address": s.address} for s in db.scalars(q)]


@router.post("/sites", status_code=201)
def create_site(body: SiteIn, request: Request, user: User = Depends(require("manage_users")), db: Session = Depends(get_db)):
    s = Site(**body.model_dump())
    db.add(s)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "Site name already exists")
    audit(db, user.username, "site_created", s.name, request=request)
    return {"id": s.id, **body.model_dump()}


@router.delete("/sites/{site_id}")
def delete_site(site_id: int, request: Request, user: User = Depends(require("manage_users")), db: Session = Depends(get_db)):
    s = db.get(Site, site_id) or _404()
    if db.scalar(select(func.count()).select_from(Camera).where(Camera.site_id == site_id)) or \
       db.scalar(select(func.count()).select_from(NVR).where(NVR.site_id == site_id)):
        raise HTTPException(409, "Site still has cameras or NVRs")
    db.delete(s)
    audit(db, user.username, "site_deleted", s.name, request=request)
    return {"ok": True}


def _404():
    raise HTTPException(404, "Not found")


# --------------------------------------------------------------- cameras ----
class CameraIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    site_id: int
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
    enabled: bool = True


def _validate_camera(body: CameraIn, db: Session, user: User) -> None:
    check_site(user, body.site_id)
    if not db.get(Site, body.site_id):
        raise HTTPException(422, "Unknown site")
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
        if not nvr or nvr.site_id != body.site_id:
            raise HTTPException(422, "NVR must exist and belong to the same site")


@router.get("/cameras")
def list_cameras(user: User = Depends(require("view")), db: Session = Depends(get_db),
                 site_id: int | None = None, status: str | None = None, power_type: str | None = None,
                 q: str | None = None, nvr_id: int | None = None):
    query = scope_filter(select(Camera).order_by(Camera.site_id, Camera.name), Camera.site_id, user)
    if site_id:
        query = query.where(Camera.site_id == site_id)
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
    out = [camera_dict(c, states.get(c.id)) for c in cams]
    if status:
        out = [c for c in out if c["health"]["status"] == status]
    return out


@router.get("/cameras/export.csv", response_class=PlainTextResponse)
def export_cameras(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    rows = list_cameras(user=user, db=db)
    buf = io.StringIO()
    w = csv.writer(buf)
    cols = ["id", "name", "site", "nvr", "channel", "zone", "power_type", "status", "last_seen", "fps", "target_fps",
            "bitrate_kbps", "latency_ms", "battery_pct", "firmware", "error"]
    w.writerow(cols)
    for c in rows:
        h, d = c["health"], c["health"]["data"]
        w.writerow([c["id"], c["name"], c["site"], c["nvr"] or "", c["channel"] or "", c["zone"], c["power_type"],
                    h["status"], h["last_seen"] or "", d.get("fps", ""), c["target_fps"], d.get("bitrate_kbps", ""),
                    d.get("latency_ms", ""), d.get("battery_pct", ""), d.get("firmware", ""), h["error"]])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=cameras.csv"})


@router.get("/cameras/import/template", response_class=PlainTextResponse)
def camera_csv_template(user: User = Depends(require("manage_devices"))):
    return PlainTextResponse(onboarding.csv_template(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=camera_import_template.csv"})


@router.post("/cameras/import")
def import_cameras(request: Request, csv_text: str = Body(..., media_type="text/csv"), dry_run: bool = False,
                   user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    res = onboarding.import_csv(db, csv_text, allowed_site_ids(user), dry_run=dry_run)
    if res.get("imported"):
        audit(db, user.username, "cameras_imported", f"{res['imported']} cameras", request=request)
    return res


@router.get("/cameras/{cam_id}")
def get_camera(cam_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_site(user, c.site_id)
    return camera_dict(c, db.get(DeviceState, ("camera", c.id)))


@router.post("/cameras", status_code=201)
def create_camera(body: CameraIn, request: Request, user: User = Depends(require("manage_devices")),
                  db: Session = Depends(get_db)):
    _validate_camera(body, db, user)
    data = body.model_dump(exclude={"password"})
    c = Camera(**data, password_enc=encrypt_secret(body.password or ""))
    db.add(c)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "That NVR channel already has a camera")
    audit(db, user.username, "camera_created", c.name, request=request)
    return camera_dict(c)


@router.patch("/cameras/{cam_id}")
def update_camera(cam_id: int, body: CameraIn, request: Request, user: User = Depends(require("manage_devices")),
                  db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_site(user, c.site_id)
    _validate_camera(body, db, user)
    for k, v in body.model_dump(exclude={"password"}).items():
        setattr(c, k, v)
    if body.password is not None:
        c.password_enc = encrypt_secret(body.password)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "That NVR channel already has a camera")
    audit(db, user.username, "camera_updated", c.name, request=request)
    return camera_dict(c, db.get(DeviceState, ("camera", c.id)))


@router.delete("/cameras/{cam_id}")
def delete_camera(cam_id: int, request: Request, user: User = Depends(require("manage_devices")),
                  db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_site(user, c.site_id)
    st = db.get(DeviceState, ("camera", c.id))
    if st:
        db.delete(st)
    db.delete(c)
    audit(db, user.username, "camera_deleted", c.name, request=request)
    return {"ok": True}


@router.put("/cameras/{cam_id}/analytics")
def set_analytics(cam_id: int, request: Request, rules: list[dict] = Body(...),
                  user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_site(user, c.site_id)
    errs = {i: e for i, r in enumerate(rules) if (e := validate_rule_config(r))}
    if errs:
        raise HTTPException(422, {"errors": errs})
    c.analytics = rules
    audit(db, user.username, "camera_analytics_updated", c.name, {"count": len(rules)}, request=request)
    return {"ok": True, "analytics": rules}


@router.post("/cameras/{cam_id}/check")
def check_camera(cam_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_site(user, c.site_id)
    collector.store_reading(db, "camera", c, drivers.read_camera(c))
    db.commit()
    return camera_dict(c, db.get(DeviceState, ("camera", c.id)))


@router.post("/cameras/{cam_id}/reset-reference")
def reset_reference(cam_id: int, request: Request, user: User = Depends(require("manage_devices")),
                    db: Session = Depends(get_db)):
    c = db.get(Camera, cam_id) or _404()
    check_site(user, c.site_id)
    drivers.reset_reference_frame(c.id)
    audit(db, user.username, "camera_reference_reset", c.name, request=request)
    return {"ok": True}


@router.get("/metrics/{device_type}/{device_id}")
def metrics(device_type: str, device_id: int, keys: str = Query("online"), hours: int = Query(24, le=24 * 90),
            user: User = Depends(require("view")), db: Session = Depends(get_db)):
    model = {"camera": Camera, "nvr": NVR}.get(device_type) or _404()
    dev = db.get(model, device_id) or _404()
    check_site(user, dev.site_id)
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
    site_id: int
    vendor: str = "generic"
    model: str = ""
    host: str = Field(min_length=1)
    http_port: int = 80
    rtsp_port: int = 554
    username: str = ""
    password: str | None = None
    channels: int = Field(16, ge=1, le=256)
    driver: str = "tcp"
    enabled: bool = True


def _validate_nvr(body: NvrIn, db: Session, user: User):
    check_site(user, body.site_id)
    if not db.get(Site, body.site_id):
        raise HTTPException(422, "Unknown site")
    if body.driver not in drivers.NVR_DRIVERS:
        raise HTTPException(422, f"driver must be one of {sorted(drivers.NVR_DRIVERS)}")


@router.get("/nvrs")
def list_nvrs(user: User = Depends(require("view")), db: Session = Depends(get_db), site_id: int | None = None):
    q = scope_filter(select(NVR).order_by(NVR.site_id, NVR.name), NVR.site_id, user)
    if site_id:
        q = q.where(NVR.site_id == site_id)
    nvrs = db.scalars(q).all()
    states = _states(db, "nvr", [n.id for n in nvrs])
    counts = dict(db.execute(select(Camera.nvr_id, func.count()).where(Camera.nvr_id.is_not(None)).group_by(Camera.nvr_id)).all())
    return [nvr_dict(n, states.get(n.id), counts.get(n.id, 0)) for n in nvrs]


@router.get("/nvrs/{nvr_id}")
def get_nvr(nvr_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_site(user, n.site_id)
    cnt = db.scalar(select(func.count()).select_from(Camera).where(Camera.nvr_id == n.id))
    return nvr_dict(n, db.get(DeviceState, ("nvr", n.id)), cnt or 0)


@router.post("/nvrs", status_code=201)
def create_nvr(body: NvrIn, request: Request, user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    _validate_nvr(body, db, user)
    n = NVR(**body.model_dump(exclude={"password"}), password_enc=encrypt_secret(body.password or ""))
    db.add(n)
    db.flush()
    audit(db, user.username, "nvr_created", n.name, request=request)
    return nvr_dict(n)


@router.patch("/nvrs/{nvr_id}")
def update_nvr(nvr_id: int, body: NvrIn, request: Request, user: User = Depends(require("manage_devices")),
               db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_site(user, n.site_id)
    _validate_nvr(body, db, user)
    for k, v in body.model_dump(exclude={"password"}).items():
        setattr(n, k, v)
    if body.password is not None:
        n.password_enc = encrypt_secret(body.password)
    audit(db, user.username, "nvr_updated", n.name, request=request)
    return nvr_dict(n, db.get(DeviceState, ("nvr", n.id)))


@router.delete("/nvrs/{nvr_id}")
def delete_nvr(nvr_id: int, request: Request, user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_site(user, n.site_id)
    st = db.get(DeviceState, ("nvr", n.id))
    if st:
        db.delete(st)
    db.delete(n)
    audit(db, user.username, "nvr_deleted", n.name, request=request)
    return {"ok": True}


class ChannelImportIn(BaseModel):
    channels: list[int] | None = None
    main_template: str = ""
    sub_template: str = ""
    driver: str = "generic"


@router.post("/nvrs/{nvr_id}/import-channels")
def nvr_import_channels(nvr_id: int, body: ChannelImportIn, request: Request,
                        user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_site(user, n.site_id)
    if body.driver not in drivers.CAMERA_DRIVERS:
        raise HTTPException(422, "Unknown camera driver")
    if body.channels and any(ch < 1 or ch > n.channels for ch in body.channels):
        raise HTTPException(422, f"Channels must be between 1 and {n.channels}")
    try:
        created = onboarding.import_nvr_channels(db, n, body.channels, body.main_template, body.sub_template, body.driver)
    except (ValueError, KeyError) as e:
        raise HTTPException(422, str(e))
    audit(db, user.username, "nvr_channels_imported", n.name, {"created": len(created)}, request=request)
    return {"created": len(created), "cameras": [camera_dict(c) for c in created]}


@router.post("/nvrs/{nvr_id}/check")
def check_nvr(nvr_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    n = db.get(NVR, nvr_id) or _404()
    check_site(user, n.site_id)
    collector.store_reading(db, "nvr", n, drivers.read_nvr(n))
    db.commit()
    return get_nvr(nvr_id, user, db)


# ------------------------------------------------------------- discovery ----
@router.post("/discovery")
def run_discovery(request: Request, timeout: float = Query(3.0, ge=1, le=10), iface_ip: str = "",
                  user: User = Depends(require("manage_devices")), db: Session = Depends(get_db)):
    found = onboarding.discover(timeout, iface_ip)
    known = {h for (h,) in db.execute(select(Camera.host)).all() if h}
    for f in found:
        f["already_added"] = f.get("host") in known
    audit(db, user.username, "onvif_discovery", details={"found": len(found)}, request=request)
    return found
