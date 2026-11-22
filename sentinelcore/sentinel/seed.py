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
from .models import NVR, AlertContact, Camera, Event, Location, Organization, User, utcnow
from .security import hash_password


def bootstrap(db: Session) -> str | None:
    """Create the first platform super admin if no users exist. Returns the generated
    password when one was generated (printed once to the server log)."""
    alerts.seed_default_rules(db)
    if db.scalar(select(User.id).limit(1)) is not None:
        return None
    pw = settings.admin_password or secrets.token_urlsafe(12)
    db.add(User(username="admin", full_name="Administrator", password_hash=hash_password(pw), role="super_admin"))
    db.commit()
    return None if settings.admin_password else pw


ZONES = ["Main Gate", "Lobby", "Parking", "Loading Bay", "Perimeter East", "Corridor", "Cash Counter", "Server Room"]
DEPARTMENTS = ["Security", "Operations", "Admin", "Finance", "Logistics", "IT"]
EVENT_TYPES = [("zone_intrusion", "person"), ("line_crossing", "car"), ("loitering", "person"),
               ("ppe_violation", "person"), ("anpr_read", "car"), ("crowd_density", "person"),
               ("object_left", "backpack"), ("slip_fall", "person"), ("face_match", "person")]

# (org name, code, require_approval, tree). Tree nodes: (kind, name, city, children, nvrs)
DEMO_ORGS = [
    ("Acme Retail Pvt Ltd", "ACME", True, ("corporate", "Corporate Office", "Bengaluru", [
        ("region", "West Region", "Mumbai", [
            ("branch", "Mumbai Andheri Branch", "Mumbai", [], 1),
            ("warehouse", "Pune Warehouse", "Pune", [], 1),
        ], 0),
        ("region", "South Region", "Chennai", [
            ("store", "Chennai T Nagar Store", "Chennai", [], 1),
        ], 0),
    ], 1)),
    ("Globex Logistics", "GLBX", False, ("corporate", "Head Office", "Delhi", [
        ("branch", "Gurugram Hub", "Gurugram", [], 1),
    ], 1)),
]


def seed_demo(db: Session) -> bool:
    if db.scalar(select(Organization.id).limit(1)) is not None:
        return False
    r = random.Random(7)
    cams: list[Camera] = []
    named: dict[str, Location] = {}
    counter = [0]

    def build(org, node, parent):
        kind, name, city, children, n_nvrs = node
        loc = Location(org_id=org.id, parent_id=parent.id if parent else None, kind=kind, name=name, city=city,
                       code=f"{org.code}-{len(named) + 1:03d}")
        db.add(loc)
        db.flush()
        named[name] = loc
        for ni in range(n_nvrs):
            counter[0] += 1
            k = counter[0]
            nvr = NVR(location_id=loc.id, name=f"{name} NVR-{ni + 1}", vendor="hikvision", model="DS-7616NI-K2",
                      host=f"10.{k}.0.10", channels=16, driver="simulator", department="Security")
            db.add(nvr)
            db.flush()
            for ch in range(1, 9):
                power = "poe" if ch <= 6 else r.choice(["battery", "solar"])
                cams.append(Camera(location_id=loc.id, nvr_id=nvr.id, channel=ch,
                                   name=f"{name.split()[0]} {ZONES[ch % len(ZONES)]} {ch:02d}", vendor="hikvision",
                                   host=f"10.{k}.0.{100 + ch}", rtsp_url=f"rtsp://10.{k}.0.{100 + ch}:554/Streaming/Channels/101",
                                   power_type=power, driver="simulator", building="Block A" if ch < 5 else "Block B",
                                   floor=str(ch % 3), zone=ZONES[ch % len(ZONES)], target_fps=25,
                                   department=DEPARTMENTS[ch % len(DEPARTMENTS)]))
        for child in children:
            build(org, child, loc)

    orgs = []
    for oname, code, approval, tree in DEMO_ORGS:
        org = Organization(name=oname, code=code, require_approval=approval)
        db.add(org)
        db.flush()
        orgs.append(org)
        build(org, tree, None)
    db.add_all(cams)
    db.flush()
    now = utcnow()
    for _ in range(160):
        cam = r.choice(cams)
        et, oc = r.choice(EVENT_TYPES)
        status = r.choices(["new", "acknowledged", "true_alarm", "false_alarm"], [3, 2, 4, 1])[0]
        db.add(Event(ts=now - timedelta(minutes=r.randint(1, 60 * 24 * 7)), camera_id=cam.id, location_id=cam.location_id,
                     type=et, object_class=oc, confidence=round(r.uniform(0.55, 0.98), 2), zone=cam.zone,
                     source=r.choice(["edge", "server"]), status=status, details={"demo": True}))
    acme, globex = orgs
    pw = hash_password("Demo@12345")
    for uname, full, desig, role, org, locs in (
        ("acme.admin", "Priya Sharma", "Head of Security", "org_admin", acme, []),
        ("west.manager", "Rahul Mehta", "Regional Security Manager", "location_admin", acme, ["West Region"]),
        ("andheri.admin", "Sanjay Patil", "Branch Admin", "location_admin", acme, ["Mumbai Andheri Branch"]),
        ("andheri.guard", "Vikram Singh", "Security Supervisor", "operator", acme, ["Mumbai Andheri Branch"]),
        ("acme.auditor", "Neha Iyer", "Internal Auditor", "auditor", acme, []),
        ("globex.admin", "Arjun Kapoor", "Facilities Head", "org_admin", globex, []),
    ):
        db.add(User(username=uname, full_name=full, designation=desig, role=role, org_id=org.id, password_hash=pw,
                    locations=[named[n] for n in locs]))
    for loc_name, name, desig, phone, email, sev, delay, sms in (
        ("Mumbai Andheri Branch", "Vikram Singh", "Security Supervisor", "+919800000001", "vikram@acme.example", "warning", 0, True),
        ("West Region", "Rahul Mehta", "Regional Security Manager", "+919800000002", "rahul@acme.example", "critical", 30, True),
        ("Corporate Office", "Priya Sharma", "Head of Security", "+919800000003", "priya@acme.example", "critical", 60, False),
        ("Head Office", "Arjun Kapoor", "Facilities Head", "+919800000004", "arjun@globex.example", "warning", 0, False),
    ):
        db.add(AlertContact(location_id=named[loc_name].id, name=name, designation=desig, phone=phone, email=email,
                            min_severity=sev, escalation_delay_min=delay, notify_sms=sms, notify_email=True))
    db.commit()
    return True
