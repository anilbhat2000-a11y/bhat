from __future__ import annotations

from datetime import datetime

from ..models import NVR, Alert, Camera, DeviceState, Event, User


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


def state_dict(st: DeviceState | None) -> dict:
    if st is None:
        return {"status": "unknown", "online": None, "last_seen": None, "last_checked": None, "error": "", "data": {}}
    return {"status": "online" if st.online else "offline", "online": st.online, "last_seen": iso(st.last_seen),
            "last_checked": iso(st.last_checked), "error": st.error, "data": st.data or {}}


def identity(d) -> dict:
    return {"manufacturer": d.manufacturer, "serial_number": d.serial_number, "firmware": d.firmware,
            "mac_address": d.mac_address, "department": d.department, "info_updated_at": iso(d.info_updated_at)}


def camera_dict(c: Camera, st: DeviceState | None = None, path: str = "") -> dict:
    return {"id": c.id, "name": c.name, "location_id": c.location_id, "location": c.location.name if c.location else "",
            "location_path": path or (c.location.name if c.location else ""),
            "org_id": c.location.org_id if c.location else None, "org": c.location.org.name if c.location else "",
            "nvr_id": c.nvr_id, "nvr": c.nvr.name if c.nvr else None, "channel": c.channel, "vendor": c.vendor,
            "model": c.model, "host": c.host, "onvif_port": c.onvif_port, "rtsp_url": c.rtsp_url,
            "sub_stream_url": c.sub_stream_url, "username": c.username, "has_password": bool(c.password_enc),
            "power_type": c.power_type, "driver": c.driver, "building": c.building, "floor": c.floor,
            "zone": c.zone, "tags": c.tags or [], "target_fps": c.target_fps, "analytics": c.analytics or [],
            **identity(c), "latitude": c.latitude, "longitude": c.longitude, "live_quality": c.live_quality,
            "enabled": c.enabled, "health": state_dict(st)}


def nvr_dict(n: NVR, st: DeviceState | None = None, camera_count: int = 0, path: str = "") -> dict:
    return {"id": n.id, "name": n.name, "location_id": n.location_id, "location": n.location.name if n.location else "",
            "location_path": path or (n.location.name if n.location else ""),
            "org_id": n.location.org_id if n.location else None, "org": n.location.org.name if n.location else "",
            "vendor": n.vendor, "model": n.model, "host": n.host, "http_port": n.http_port, "rtsp_port": n.rtsp_port,
            "username": n.username, "has_password": bool(n.password_enc), "channels": n.channels,
            "driver": n.driver, **identity(n), "enabled": n.enabled, "camera_count": camera_count,
            "health": state_dict(st)}


def alert_dict(a: Alert, device_name: str = "") -> dict:
    return {"id": a.id, "rule_id": a.rule_id, "device_type": a.device_type, "device_id": a.device_id,
            "device_name": device_name, "location_id": a.location_id, "severity": a.severity, "message": a.message,
            "value": a.value, "status": a.status, "opened_at": iso(a.opened_at),
            "acknowledged_by": a.acknowledged_by, "acknowledged_at": iso(a.acknowledged_at),
            "resolved_at": iso(a.resolved_at)}


def event_dict(e: Event, camera_name: str = "", location_name: str = "") -> dict:
    return {"id": e.id, "ts": iso(e.ts), "camera_id": e.camera_id, "camera": camera_name, "location_id": e.location_id,
            "location": location_name, "type": e.type, "object_class": e.object_class, "confidence": e.confidence,
            "zone": e.zone, "source": e.source, "details": e.details or {}, "snapshot_url": e.snapshot_url,
            "clip_url": e.clip_url, "status": e.status, "handled_by": e.handled_by, "handled_at": iso(e.handled_at),
            "notes": e.notes}


def user_dict(u: User, paths: dict[int, str] | None = None) -> dict:
    paths = paths or {}
    return {"id": u.id, "username": u.username, "full_name": u.full_name, "designation": u.designation,
            "role": u.role, "active": u.active, "org_id": u.org_id, "org": u.org.name if u.org else "",
            "locations": [{"id": s.id, "name": s.name, "path": paths.get(s.id, s.name)} for s in u.locations],
            "created_at": iso(u.created_at)}
