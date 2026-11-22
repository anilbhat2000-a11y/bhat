"""First-run bootstrap (admin user + default alert rules) and optional demo fleet.

Demo devices use the `simulator` driver and every reading is tagged
source="simulator", which the UI shows as a "SIMULATED" badge.
"""
from __future__ import annotations

import random
import secrets
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .health import alerts
from .models import NVR, Camera, Event, Site, User, utcnow
from .security import hash_password


def bootstrap(db: Session) -> str | None:
    """Create the first super admin if no users exist. Returns the generated
    password when one was generated (printed once to the server log)."""
    alerts.seed_default_rules(db)
    if db.scalar(select(User.id).limit(1)) is not None:
        return None
    pw = settings.admin_password or secrets.token_urlsafe(12)
    db.add(User(username="admin", full_name="Administrator", password_hash=hash_password(pw), role="super_admin"))
    db.commit()
    return None if settings.admin_password else pw


DEMO_SITES = [("Head Office", "Bengaluru"), ("Warehouse North", "Pune"), ("Retail Store 14", "Mumbai")]
ZONES = ["Main Gate", "Lobby", "Parking", "Loading Bay", "Perimeter East", "Corridor", "Cash Counter", "Server Room"]
EVENT_TYPES = [("zone_intrusion", "person"), ("line_crossing", "car"), ("loitering", "person"),
               ("ppe_violation", "person"), ("anpr_read", "car"), ("crowd_density", "person"),
               ("object_left", "backpack"), ("slip_fall", "person"), ("face_match", "person")]


def seed_demo(db: Session) -> bool:
    if db.scalar(select(Site.id).limit(1)) is not None:
        return False
    r = random.Random(7)
    sites = [Site(name=n, city=c) for n, c in DEMO_SITES]
    db.add_all(sites)
    db.flush()
    cams: list[Camera] = []
    for si, site in enumerate(sites):
        for ni in range(2 if si == 0 else 1):
            nvr = NVR(site_id=site.id, name=f"{site.name} NVR-{ni + 1}", vendor="hikvision", model="DS-7616NI-K2",
                      host=f"10.{si}.{ni}.10", channels=16, driver="simulator")
            db.add(nvr)
            db.flush()
            for ch in range(1, 13):
                power = "poe" if ch <= 10 else r.choice(["battery", "solar"])
                cams.append(Camera(site_id=site.id, nvr_id=nvr.id, channel=ch, name=f"{site.name[:12]} {ZONES[ch % len(ZONES)]} {ch:02d}",
                                   vendor="hikvision", host=f"10.{si}.{ni}.{100 + ch}",
                                   rtsp_url=f"rtsp://10.{si}.{ni}.{100 + ch}:554/Streaming/Channels/101",
                                   power_type=power, driver="simulator", building="Block A" if ch < 7 else "Block B",
                                   floor=str(ch % 3), zone=ZONES[ch % len(ZONES)], target_fps=25))
    db.add_all(cams)
    db.flush()
    now = utcnow()
    for _ in range(160):
        cam = r.choice(cams)
        et, oc = r.choice(EVENT_TYPES)
        status = r.choices(["new", "acknowledged", "true_alarm", "false_alarm"], [3, 2, 4, 1])[0]
        db.add(Event(ts=now - timedelta(minutes=r.randint(1, 60 * 24 * 7)), camera_id=cam.id, site_id=cam.site_id,
                     type=et, object_class=oc, confidence=round(r.uniform(0.55, 0.98), 2), zone=cam.zone,
                     source=r.choice(["edge", "server"]), status=status, details={"demo": True}))
    for name, role, site_idx in (("operator1", "operator", [0]), ("siteadmin", "site_admin", [1]),
                                 ("viewer1", "viewer", [2]), ("auditor1", "auditor", [])):
        db.add(User(username=name, full_name=name.title(), role=role, password_hash=hash_password("Demo@12345"),
                    sites=[sites[i] for i in site_idx]))
    db.commit()
    return True
