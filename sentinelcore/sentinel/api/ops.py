"""Dashboards data, alerts, alert rules, analytics events, edge ingest, users, audit."""
from __future__ import annotations

import secrets
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..audit import audit
from ..db import get_db
from ..health.alerts import OPS
from ..health.probes import ffprobe_available
from ..models import (EVENT_STATUSES, NVR, ROLES, Alert, AlertRule, AuditLog, Camera, DeviceState, EdgeDevice, Event,
                      HealthMetric, Site, User, utcnow)
from ..security import (check_site, hash_password, require, scope_filter, verify_password)
from ..config import settings
from .serializers import alert_dict, event_dict, iso, user_dict

router = APIRouter(prefix="/api", tags=["ops"])
VERSION = "0.1.0"


def _scoped_ids(db: Session, model, user: User) -> list[int]:
    return list(db.scalars(scope_filter(select(model.id), model.site_id, user)))


# ------------------------------------------------------------ health summary
@router.get("/health/summary")
def health_summary(user: User = Depends(require("view")), db: Session = Depends(get_db), site_id: int | None = None):
    cam_q = scope_filter(select(Camera).where(Camera.enabled.is_(True)), Camera.site_id, user)
    nvr_q = scope_filter(select(NVR).where(NVR.enabled.is_(True)), NVR.site_id, user)
    if site_id:
        check_site(user, site_id)
        cam_q, nvr_q = cam_q.where(Camera.site_id == site_id), nvr_q.where(NVR.site_id == site_id)
    cams, nvrs = db.scalars(cam_q).all(), db.scalars(nvr_q).all()
    cstates = {s.device_id: s for s in db.scalars(select(DeviceState).where(DeviceState.device_type == "camera"))}
    nstates = {s.device_id: s for s in db.scalars(select(DeviceState).where(DeviceState.device_type == "nvr"))}

    cam = Counter()
    battery = {"devices": 0, "reporting": 0, "low": 0, "critical": 0, "charging": 0}
    image_issues = Counter()
    per_site: dict[int, dict] = defaultdict(lambda: {"cameras": 0, "online": 0, "nvrs": 0, "nvr_faults": 0, "name": ""})
    simulated = False
    for c in cams:
        st = cstates.get(c.id)
        status = "unknown" if st is None else ("online" if st.online else "offline")
        cam[status] += 1
        ps = per_site[c.site_id]
        ps["name"], ps["cameras"] = c.site.name, ps["cameras"] + 1
        ps["online"] += status == "online"
        d = (st.data if st else {}) or {}
        simulated |= d.get("source") == "simulator"
        if status == "online":
            for flag in ("blurred", "blank", "frozen", "too_dark", "too_bright", "view_changed"):
                if d.get(flag):
                    image_issues[flag] += 1
            if d.get("fps") is not None and c.target_fps and d["fps"] < 0.6 * c.target_fps:
                image_issues["low_fps"] += 1
        if c.power_type in ("battery", "solar"):
            battery["devices"] += 1
            if "battery_pct" in d:
                battery["reporting"] += 1
                battery["low"] += d["battery_pct"] < 20
                battery["critical"] += d["battery_pct"] < 10
                battery["charging"] += bool(d.get("charging"))
    nvr = Counter()
    storage = {"total_gb": 0.0, "disk_errors": 0, "min_retention_days": None, "recording_gaps": 0}
    for n in nvrs:
        st = nstates.get(n.id)
        status = "unknown" if st is None else ("online" if st.online else "offline")
        d = (st.data if st else {}) or {}
        fault = status != "online" or d.get("disk_errors", 0) > 0
        nvr["fault" if fault else "healthy"] += 1
        nvr[status] += 1
        ps = per_site[n.site_id]
        ps["name"], ps["nvrs"], ps["nvr_faults"] = n.site.name, ps["nvrs"] + 1, ps["nvr_faults"] + fault
        storage["total_gb"] += d.get("storage_total_gb", 0)
        storage["disk_errors"] += d.get("disk_errors", 0)
        if "retention_days" in d:
            r = storage["min_retention_days"]
            storage["min_retention_days"] = d["retention_days"] if r is None else min(r, d["retention_days"])
        if "recording_channels" in d and "total_channels" in d:
            storage["recording_gaps"] += max(0, d["total_channels"] - d["recording_channels"])
    alert_q = scope_filter(select(Alert.severity, func.count()).where(Alert.status != "resolved"), Alert.site_id, user)
    event_q = scope_filter(select(func.count()).select_from(Event).where(Event.status == "new"), Event.site_id, user)
    if site_id:
        alert_q, event_q = alert_q.where(Alert.site_id == site_id), event_q.where(Event.site_id == site_id)
    open_alerts = dict(db.execute(alert_q.group_by(Alert.severity)).all())
    total = len(cams)
    return {
        "generated_at": iso(utcnow()), "simulated": simulated,
        "cameras": {"total": total, "online": cam["online"], "offline": cam["offline"], "unknown": cam["unknown"],
                    "online_pct": round(100 * cam["online"] / total, 1) if total else None,
                    "image_issues": dict(image_issues)},
        "nvrs": {"total": len(nvrs), "healthy": nvr["healthy"], "fault": nvr["fault"], "online": nvr["online"],
                 "offline": nvr["offline"], "unknown": nvr["unknown"]},
        "battery": battery,
        "storage": {**storage, "total_gb": round(storage["total_gb"], 1)},
        "alerts": {"open": sum(open_alerts.values()), "by_severity": open_alerts},
        "events_new": db.scalar(event_q) or 0,
        "sites": [{"site_id": k, **v, "online_pct": round(100 * v["online"] / v["cameras"], 1) if v["cameras"] else None}
                  for k, v in sorted(per_site.items(), key=lambda kv: kv[1]["name"])],
    }


@router.get("/health/trend")
def health_trend(hours: int = Query(24, ge=1, le=24 * 90), device_type: str = "camera",
                 user: User = Depends(require("view")), db: Session = Depends(get_db)):
    """Hourly % of checks that found devices online (uptime trend)."""
    model = {"camera": Camera, "nvr": NVR}.get(device_type)
    if model is None:
        raise HTTPException(422, "device_type must be camera or nvr")
    ids = _scoped_ids(db, model, user)
    since = utcnow() - timedelta(hours=hours)
    if not ids:
        return []
    rows = db.execute(select(HealthMetric.ts, HealthMetric.value).where(
        HealthMetric.device_type == device_type, HealthMetric.key == "online",
        HealthMetric.device_id.in_(ids), HealthMetric.ts >= since)).all()
    buckets: dict[datetime, list[float]] = defaultdict(list)
    for ts, v in rows:
        buckets[ts.replace(minute=0, second=0, microsecond=0)].append(v)
    return [{"hour": iso(h), "online_pct": round(100 * sum(v) / len(v), 1), "samples": len(v)}
            for h, v in sorted(buckets.items())]


@router.get("/health/worst")
def worst_devices(hours: int = Query(24, ge=1, le=24 * 30), limit: int = Query(10, le=50),
                  user: User = Depends(require("view")), db: Session = Depends(get_db)):
    ids = _scoped_ids(db, Camera, user)
    if not ids:
        return []
    since = utcnow() - timedelta(hours=hours)
    rows = db.execute(select(HealthMetric.device_id, func.avg(HealthMetric.value), func.count()).where(
        HealthMetric.device_type == "camera", HealthMetric.key == "online", HealthMetric.device_id.in_(ids),
        HealthMetric.ts >= since).group_by(HealthMetric.device_id).order_by(func.avg(HealthMetric.value)).limit(limit)).all()
    names = {c.id: (c.name, c.site.name) for c in db.scalars(select(Camera).where(Camera.id.in_([r[0] for r in rows])))}
    return [{"camera_id": cid, "name": names.get(cid, ("?", ""))[0], "site": names.get(cid, ("", "?"))[1],
             "uptime_pct": round(100 * avg, 1), "samples": n} for cid, avg, n in rows if avg < 1]


# ------------------------------------------------------------------ alerts
def _device_names(db: Session, alerts: list[Alert]) -> dict[tuple[str, int], str]:
    out = {}
    cam_ids = [a.device_id for a in alerts if a.device_type == "camera"]
    nvr_ids = [a.device_id for a in alerts if a.device_type == "nvr"]
    if cam_ids:
        out.update({("camera", i): n for i, n in db.execute(select(Camera.id, Camera.name).where(Camera.id.in_(cam_ids)))})
    if nvr_ids:
        out.update({("nvr", i): n for i, n in db.execute(select(NVR.id, NVR.name).where(NVR.id.in_(nvr_ids)))})
    return out


@router.get("/alerts")
def list_alerts(user: User = Depends(require("view")), db: Session = Depends(get_db), status: str = "active",
                severity: str | None = None, site_id: int | None = None, limit: int = Query(200, le=1000)):
    q = scope_filter(select(Alert).order_by(Alert.opened_at.desc()), Alert.site_id, user)
    if status == "active":
        q = q.where(Alert.status != "resolved")
    elif status != "all":
        q = q.where(Alert.status == status)
    if severity:
        q = q.where(Alert.severity == severity)
    if site_id:
        q = q.where(Alert.site_id == site_id)
    alerts = db.scalars(q.limit(limit)).all()
    names = _device_names(db, alerts)
    return [alert_dict(a, names.get((a.device_type, a.device_id), "")) for a in alerts]


@router.post("/alerts/{alert_id}/ack")
def ack_alert(alert_id: int, request: Request, user: User = Depends(require("ack")), db: Session = Depends(get_db)):
    a = db.get(Alert, alert_id)
    if not a:
        raise HTTPException(404, "Not found")
    check_site(user, a.site_id)
    if a.status == "open":
        a.status, a.acknowledged_by, a.acknowledged_at = "acknowledged", user.username, utcnow()
        audit(db, user.username, "alert_acknowledged", f"alert {a.id}", request=request)
    return alert_dict(a)


class RuleIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    device_type: str
    metric: str = Field(min_length=1, max_length=40)
    op: str
    threshold: float
    duration_s: int = Field(0, ge=0, le=86400 * 7)
    severity: str = "warning"
    enabled: bool = True


def _check_rule(body: RuleIn):
    if body.device_type not in ("camera", "nvr"):
        raise HTTPException(422, "device_type must be camera or nvr")
    if body.op not in OPS:
        raise HTTPException(422, f"op must be one of {list(OPS)}")
    if body.severity not in ("info", "warning", "critical"):
        raise HTTPException(422, "severity must be info, warning or critical")


@router.get("/alert-rules")
def list_rules(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    return [{"id": r.id, "name": r.name, "device_type": r.device_type, "metric": r.metric, "op": r.op,
             "threshold": r.threshold, "duration_s": r.duration_s, "severity": r.severity, "enabled": r.enabled}
            for r in db.scalars(select(AlertRule).order_by(AlertRule.device_type, AlertRule.id))]


@router.post("/alert-rules", status_code=201)
def create_rule(body: RuleIn, request: Request, user: User = Depends(require("manage_rules")), db: Session = Depends(get_db)):
    _check_rule(body)
    r = AlertRule(**body.model_dump())
    db.add(r)
    db.flush()
    audit(db, user.username, "alert_rule_created", r.name, body.model_dump(), request=request)
    return {"id": r.id, **body.model_dump()}


@router.patch("/alert-rules/{rule_id}")
def update_rule(rule_id: int, body: RuleIn, request: Request, user: User = Depends(require("manage_rules")),
                db: Session = Depends(get_db)):
    _check_rule(body)
    r = db.get(AlertRule, rule_id)
    if not r:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(r, k, v)
    audit(db, user.username, "alert_rule_updated", r.name, body.model_dump(), request=request)
    return {"id": r.id, **body.model_dump()}


@router.delete("/alert-rules/{rule_id}")
def delete_rule(rule_id: int, request: Request, user: User = Depends(require("manage_rules")), db: Session = Depends(get_db)):
    r = db.get(AlertRule, rule_id)
    if not r:
        raise HTTPException(404, "Not found")
    db.delete(r)
    audit(db, user.username, "alert_rule_deleted", r.name, request=request)
    return {"ok": True}


# ------------------------------------------------------------------ events
@router.get("/events")
def list_events(user: User = Depends(require("view")), db: Session = Depends(get_db), status: str | None = None,
                type: str | None = None, site_id: int | None = None, camera_id: int | None = None,
                hours: int = Query(24 * 7, le=24 * 365), limit: int = Query(200, le=1000)):
    q = scope_filter(select(Event).where(Event.ts >= utcnow() - timedelta(hours=hours)).order_by(Event.ts.desc()),
                     Event.site_id, user)
    for col, val in ((Event.status, status), (Event.type, type), (Event.site_id, site_id), (Event.camera_id, camera_id)):
        if val:
            q = q.where(col == val)
    events = db.scalars(q.limit(limit)).all()
    cams = {c.id: c for c in db.scalars(select(Camera).where(Camera.id.in_({e.camera_id for e in events})))}
    return [event_dict(e, cams[e.camera_id].name if e.camera_id in cams else "",
                       cams[e.camera_id].site.name if e.camera_id in cams else "") for e in events]


@router.get("/events/stats")
def event_stats(days: int = Query(7, ge=1, le=90), user: User = Depends(require("view")), db: Session = Depends(get_db)):
    q = scope_filter(select(Event.type, Event.status, func.count()).where(Event.ts >= utcnow() - timedelta(days=days)),
                     Event.site_id, user).group_by(Event.type, Event.status)
    by_type: dict[str, dict] = defaultdict(lambda: {"total": 0, "true_alarm": 0, "false_alarm": 0})
    for t, s, n in db.execute(q).all():
        by_type[t]["total"] += n
        if s in ("true_alarm", "false_alarm"):
            by_type[t][s] += n
    closed_true = sum(v["true_alarm"] for v in by_type.values())
    closed_false = sum(v["false_alarm"] for v in by_type.values())
    reviewed = closed_true + closed_false
    return {"days": days, "by_type": dict(by_type), "reviewed": reviewed,
            "false_alarm_pct": round(100 * closed_false / reviewed, 1) if reviewed else None}


class HandleIn(BaseModel):
    status: str
    notes: str = ""


@router.post("/events/{event_id}/handle")
def handle_event(event_id: int, body: HandleIn, request: Request, user: User = Depends(require("ack")),
                 db: Session = Depends(get_db)):
    if body.status not in EVENT_STATUSES[1:]:
        raise HTTPException(422, f"status must be one of {EVENT_STATUSES[1:]}")
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(404, "Not found")
    check_site(user, e.site_id)
    e.status, e.handled_by, e.handled_at = body.status, user.username, utcnow()
    if body.notes:
        e.notes = (e.notes + "\n" if e.notes else "") + f"[{user.username}] {body.notes}"
    audit(db, user.username, "event_handled", f"event {e.id}", {"status": body.status}, request=request)
    return event_dict(e)


# ------------------------------------------------------------ edge devices
class EdgeIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    site_id: int


@router.get("/edge-devices")
def list_edge(user: User = Depends(require("manage_edge")), db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name, "site_id": d.site_id, "key_prefix": d.key_prefix,
             "last_seen": iso(d.last_seen), "enabled": d.enabled} for d in db.scalars(select(EdgeDevice))]


@router.post("/edge-devices", status_code=201)
def create_edge(body: EdgeIn, request: Request, user: User = Depends(require("manage_edge")), db: Session = Depends(get_db)):
    if not db.get(Site, body.site_id):
        raise HTTPException(422, "Unknown site")
    prefix = secrets.token_hex(4)
    key = f"sc_{prefix}_{secrets.token_urlsafe(32)}"
    d = EdgeDevice(name=body.name, site_id=body.site_id, key_prefix=prefix, api_key_hash=hash_password(key[:72]))
    db.add(d)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "Name already used")
    audit(db, user.username, "edge_device_created", d.name, request=request)
    return {"id": d.id, "name": d.name, "api_key": key, "note": "Store this key now; it is not shown again."}


@router.delete("/edge-devices/{dev_id}")
def delete_edge(dev_id: int, request: Request, user: User = Depends(require("manage_edge")), db: Session = Depends(get_db)):
    d = db.get(EdgeDevice, dev_id)
    if not d:
        raise HTTPException(404, "Not found")
    db.delete(d)
    audit(db, user.username, "edge_device_deleted", d.name, request=request)
    return {"ok": True}


def edge_device(x_edge_key: str = Header(...), db: Session = Depends(get_db)) -> EdgeDevice:
    parts = x_edge_key.split("_")
    if len(parts) < 3 or parts[0] != "sc":
        raise HTTPException(401, "Invalid edge key")
    d = db.scalar(select(EdgeDevice).where(EdgeDevice.key_prefix == parts[1], EdgeDevice.enabled.is_(True)))
    if not d or not verify_password(x_edge_key[:72], d.api_key_hash):
        raise HTTPException(401, "Invalid edge key")
    return d


class EdgeEventIn(BaseModel):
    camera_id: int
    type: str = Field(min_length=1, max_length=40)
    object_class: str = ""
    confidence: float = Field(0, ge=0, le=1)
    zone: str = ""
    ts: float | None = None  # unix seconds; server time if omitted
    details: dict = {}
    snapshot_url: str = ""
    clip_url: str = ""


@router.post("/edge/events", status_code=201)
def ingest_event(body: EdgeEventIn, dev: EdgeDevice = Depends(edge_device), db: Session = Depends(get_db)):
    cam = db.get(Camera, body.camera_id)
    if not cam or cam.site_id != dev.site_id:
        raise HTTPException(404, "Camera not found for this edge device's site")
    ts = datetime.fromtimestamp(body.ts, timezone.utc).replace(tzinfo=None) if body.ts else utcnow()
    e = Event(ts=ts, camera_id=cam.id, site_id=cam.site_id, type=body.type, object_class=body.object_class,
              confidence=body.confidence, zone=body.zone or cam.zone, source="edge", details=body.details,
              snapshot_url=body.snapshot_url, clip_url=body.clip_url)
    dev.last_seen = utcnow()
    db.add(e)
    db.commit()
    return {"id": e.id}


# ------------------------------------------------------------------- users
class UserIn(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    full_name: str = ""
    role: str = "viewer"
    password: str | None = None
    site_ids: list[int] = []
    active: bool = True


@router.get("/users")
def list_users(user: User = Depends(require("manage_users")), db: Session = Depends(get_db)):
    return [user_dict(u) for u in db.scalars(select(User).order_by(User.username))]


def _apply_user(u: User, body: UserIn, db: Session):
    if body.role not in ROLES:
        raise HTTPException(422, f"role must be one of {ROLES}")
    if body.password is not None and len(body.password) < 10:
        raise HTTPException(422, "Password must be at least 10 characters")
    sites = db.scalars(select(Site).where(Site.id.in_(body.site_ids))).all() if body.site_ids else []
    u.full_name, u.role, u.active, u.sites = body.full_name, body.role, body.active, list(sites)
    if body.password:
        u.password_hash = hash_password(body.password)


@router.post("/users", status_code=201)
def create_user(body: UserIn, request: Request, user: User = Depends(require("manage_users")), db: Session = Depends(get_db)):
    if not body.password:
        raise HTTPException(422, "Password is required")
    u = User(username=body.username, password_hash="")
    _apply_user(u, body, db)
    db.add(u)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "Username already exists")
    audit(db, user.username, "user_created", u.username, {"role": u.role}, request=request)
    return user_dict(u)


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: UserIn, request: Request, user: User = Depends(require("manage_users")),
                db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Not found")
    if u.id == user.id and (body.role != "super_admin" or not body.active):
        raise HTTPException(422, "You cannot demote or disable your own account")
    _apply_user(u, body, db)
    audit(db, user.username, "user_updated", u.username, {"role": u.role, "active": u.active}, request=request)
    return user_dict(u)


# ------------------------------------------------------------------- audit
@router.get("/audit")
def list_audit(user: User = Depends(require("view_audit")), db: Session = Depends(get_db),
               username: str | None = None, action: str | None = None, limit: int = Query(300, le=2000)):
    q = select(AuditLog).order_by(AuditLog.ts.desc())
    if username:
        q = q.where(AuditLog.username == username)
    if action:
        q = q.where(AuditLog.action == action)
    return [{"id": a.id, "ts": iso(a.ts), "username": a.username, "action": a.action, "target": a.target,
             "details": a.details, "ip": a.ip} for a in db.scalars(q.limit(limit))]


# ------------------------------------------------------------------ system
@router.get("/system/info")
def system_info(user: User = Depends(require("view"))):
    from ..health.drivers import CAMERA_DRIVERS, NVR_DRIVERS
    return {"version": VERSION, "collect_interval_s": settings.collect_interval_s,
            "collector_enabled": settings.collector_enabled, "ffmpeg_available": ffprobe_available(),
            "camera_drivers": sorted(CAMERA_DRIVERS), "nvr_drivers": sorted(NVR_DRIVERS),
            "metric_retention_days": settings.metric_retention_days,
            "database": settings.database_url.split(":", 1)[0]}
