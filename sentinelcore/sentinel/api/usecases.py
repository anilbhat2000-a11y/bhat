"""Use-case catalog, coverage, models & integrations, and enabling use cases on cameras."""
from __future__ import annotations

import csv
import io
import subprocess
from collections import Counter, defaultdict

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..analytics.engine import RULES, validate_rule_config
from ..audit import audit
from ..db import get_db
from ..health import probes
from ..models import Camera, Location, PlatformCapability, UseCase, User, utcnow
from ..security import check_location, decrypt_secret, descendants, location_tree, require, scope_filter
from ..usecases import CAPABILITIES, CATEGORIES, INTEGRATIONS, SECTOR_TARGETS, SECTORS, requirements_met

router = APIRouter(prefix="/api", tags=["use cases"])


def _installed(db: Session) -> tuple[set[str], set[str]]:
    caps, integ = set(), set()
    for c in db.scalars(select(PlatformCapability).where(PlatformCapability.installed.is_(True))):
        (caps if c.kind == "model" else integ).add(c.key)
    return caps, integ


def uc_dict(u: UseCase, caps: set, integ: set, enabled: int = 0) -> dict:
    d = {"key": u.key, "sector": u.sector, "sector_name": SECTORS.get(u.sector, u.sector), "category": u.category,
         "name": u.name, "description": u.description, "capabilities": u.capabilities, "integrations": u.integrations,
         "rule": u.rule, "severity": u.severity, "builtin": u.builtin, "enabled_cameras": enabled}
    miss_c, miss_i = requirements_met(d, caps, integ)
    d["missing_capabilities"], d["missing_integrations"] = miss_c, miss_i
    d["status"] = "available" if not miss_c and not miss_i else "needs_model" if miss_c else "needs_integration"
    d["configurable"] = d["rule"] is not None
    return d


def _enabled_counts(db: Session, user: User) -> Counter:
    cnt: Counter = Counter()
    for (analytics,) in db.execute(scope_filter(db, select(Camera.analytics), Camera.location_id, user)):
        for a in analytics or []:
            if a.get("use_case"):
                cnt[a["use_case"]] += 1
    return cnt


@router.get("/use-cases")
def list_use_cases(user: User = Depends(require("view")), db: Session = Depends(get_db), sector: str | None = None,
                   category: str | None = None, status: str | None = None, q: str | None = None):
    caps, integ = _installed(db)
    enabled = _enabled_counts(db, user)
    query = select(UseCase).order_by(UseCase.sector, UseCase.category, UseCase.name)
    if sector:
        query = query.where(UseCase.sector == sector)
    if category:
        query = query.where(UseCase.category == category)
    out = [uc_dict(u, caps, integ, enabled.get(u.key, 0)) for u in db.scalars(query)]
    if status:
        out = [u for u in out if u["status"] == status]
    if q:
        ql = q.lower()
        out = [u for u in out if ql in u["name"].lower() or ql in u["key"]]
    return out


@router.get("/use-cases/coverage")
def coverage(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    caps, integ = _installed(db)
    rows = [uc_dict(u, caps, integ) for u in db.scalars(select(UseCase))]
    by_sector: dict[str, dict] = {k: {"sector": k, "name": n, "target": SECTOR_TARGETS.get(k, 0), "total": 0,
                                      "available": 0, "needs_model": 0, "needs_integration": 0, "configurable": 0}
                                  for k, n in SECTORS.items()}
    by_cat: dict[str, Counter] = defaultdict(Counter)
    for r in rows:
        s = by_sector.setdefault(r["sector"], {"sector": r["sector"], "name": r["sector"], "target": 0, "total": 0,
                                               "available": 0, "needs_model": 0, "needs_integration": 0, "configurable": 0})
        s["total"] += 1
        s[r["status"]] += 1
        s["configurable"] += r["configurable"]
        by_cat[r["category"]][r["sector"]] += 1
    missing_models = Counter(c for r in rows for c in r["missing_capabilities"])
    missing_integ = Counter(i for r in rows for i in r["missing_integrations"])
    return {"sectors": list(by_sector.values()), "categories": CATEGORIES,
            "matrix": {c: dict(by_cat.get(c, {})) for c in CATEGORIES},
            "totals": {"total": len(rows), "target": sum(SECTOR_TARGETS.values()),
                       "available": sum(1 for r in rows if r["status"] == "available")},
            "unlock": {"models": [{"key": k, "name": CAPABILITIES.get(k, k), "use_cases": n} for k, n in missing_models.most_common()],
                       "integrations": [{"key": k, "name": INTEGRATIONS.get(k, k), "use_cases": n} for k, n in missing_integ.most_common()]}}


IMPORT_COLUMNS = ["key", "sector", "category", "name", "description", "capabilities", "integrations", "rule_type",
                  "classes", "severity"]


@router.get("/use-cases/import/template")
def import_template(user: User = Depends(require("manage_orgs"))):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(IMPORT_COLUMNS)
    w.writerow(["ret_price_tag", "retail", "Compliance & Audit", "Price tag missing on shelf", "", "shelf", "", "", "", "info"])
    w.writerow(["log_reefer_door", "logistics", "Operations & Productivity", "Reefer truck door open at dock", "",
                "person_vehicle", "wms", "dwell", "truck", "warning"])
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=use_case_import_template.csv"})


@router.post("/use-cases/import")
def import_use_cases(request: Request, csv_text: str = Body(..., media_type="text/csv"), dry_run: bool = False,
                     user: User = Depends(require("manage_orgs")), db: Session = Depends(get_db)):
    reader = csv.DictReader(io.StringIO(csv_text.lstrip("﻿")))
    missing = [c for c in ("key", "sector", "category", "name") if c not in (reader.fieldnames or [])]
    if missing:
        return {"imported": 0, "errors": [{"row": 1, "error": f"missing column(s): {', '.join(missing)}"}]}
    builtin_keys = {k for (k,) in db.execute(select(UseCase.key).where(UseCase.builtin.is_(True)))}
    errors, rows, seen = [], [], set()
    for i, raw in enumerate(reader, start=2):
        r = {k: (v or "").strip() for k, v in raw.items() if k}
        if not any(r.values()):
            continue
        errs = []
        key = r.get("key", "").lower()
        if not key or not all(ch.isalnum() or ch == "_" for ch in key):
            errs.append("key must be letters, digits and _")
        if key in builtin_keys:
            errs.append("key is used by a built-in use case")
        if key in seen:
            errs.append("duplicate key in file")
        seen.add(key)
        if r.get("sector") not in SECTORS:
            errs.append(f"sector must be one of {', '.join(SECTORS)}")
        if r.get("category") not in CATEGORIES:
            errs.append("category must be one of the 12 categories")
        if not r.get("name"):
            errs.append("name is required")
        caps = [c for c in r.get("capabilities", "").split(";") if c]
        integ = [c for c in r.get("integrations", "").split(";") if c]
        bad = [c for c in caps if c not in CAPABILITIES] + [c for c in integ if c not in INTEGRATIONS]
        if bad:
            errs.append(f"unknown capability/integration: {', '.join(bad)}")
        rule = None
        if r.get("rule_type"):
            rule = {"type": r["rule_type"], "classes": [c for c in r.get("classes", "person").split(";") if c] or ["person"]}
            if rule["type"] in ("line_crossing", "people_count", "tailgating"):
                rule["line"] = [[0.1, 0.55], [0.9, 0.55]]
            errs += validate_rule_config(rule)
        sev = r.get("severity") or "warning"
        if sev not in ("info", "warning", "critical"):
            errs.append("severity must be info, warning or critical")
        if errs:
            errors.append({"row": i, "error": "; ".join(errs)})
        else:
            rows.append(dict(key=key, sector=r["sector"], category=r["category"], name=r["name"],
                             description=r.get("description", ""), capabilities=caps, integrations=integ, rule=rule,
                             severity=sev))
    if errors or dry_run:
        return {"imported": 0, "valid_rows": len(rows), "errors": errors}
    existing = {u.key: u for u in db.scalars(select(UseCase).where(UseCase.key.in_([r["key"] for r in rows])))}
    for r in rows:
        if r["key"] in existing:
            for k, v in r.items():
                setattr(existing[r["key"]], k, v)
        else:
            db.add(UseCase(builtin=False, **r))
    audit(db, user.username, "use_cases_imported", f"{len(rows)} use cases", request=request)
    return {"imported": len(rows), "errors": []}


# --------------------------------------------------- models & integrations ----
@router.get("/capabilities")
def list_capabilities(user: User = Depends(require("view")), db: Session = Depends(get_db)):
    rows = db.scalars(select(PlatformCapability).order_by(PlatformCapability.kind, PlatformCapability.key)).all()
    counts = Counter()
    for u in db.scalars(select(UseCase)):
        for k in (u.capabilities or []) + (u.integrations or []):
            counts[k] += 1
    names = {**CAPABILITIES, **INTEGRATIONS}
    rows = sorted(rows, key=lambda c: (c.kind != "model", -counts.get(c.key, 0), c.key))
    return [{"key": c.key, "kind": c.kind, "name": names.get(c.key, c.key), "installed": c.installed, "note": c.note,
             "updated_by": c.updated_by, "updated_at": c.updated_at.isoformat() + "Z" if c.updated_at else None,
             "use_cases": counts.get(c.key, 0)} for c in rows]


class CapIn(BaseModel):
    installed: bool
    note: str = Field("", max_length=300)


@router.patch("/capabilities/{key}")
def set_capability(key: str, body: CapIn, request: Request, user: User = Depends(require("manage_orgs")),
                   db: Session = Depends(get_db)):
    c = db.get(PlatformCapability, key)
    if not c:
        raise HTTPException(404, "Not found")
    c.installed, c.note, c.updated_by, c.updated_at = body.installed, body.note, user.username, utcnow()
    audit(db, user.username, "capability_updated", key, body.model_dump(), request=request)
    return {"ok": True}


# ------------------------------------------------ use cases on cameras ----
class EnableIn(BaseModel):
    key: str
    polygon: list[list[float]] | None = None
    line: list[list[float]] | None = None
    params: dict = {}


def _camera(db: Session, user: User, cam_id: int) -> Camera:
    cam = db.get(Camera, cam_id)
    if not cam:
        raise HTTPException(404, "Not found")
    check_location(db, user, cam.location_id)
    return cam


ALLOWED_PARAMS = {"seconds", "max_seconds", "min_count", "max_occupancy", "max_density", "max_distance", "window_s",
                  "max_speed", "direction", "min_confidence", "classes", "classes_b", "min_track_age", "name"}


@router.post("/cameras/{cam_id}/use-cases")
def enable_use_case(cam_id: int, body: EnableIn, request: Request, user: User = Depends(require("manage_devices")),
                    db: Session = Depends(get_db)):
    cam = _camera(db, user, cam_id)
    uc = db.scalar(select(UseCase).where(UseCase.key == body.key))
    if not uc:
        raise HTTPException(404, "Unknown use case")
    if not uc.rule:
        raise HTTPException(422, "This use case runs inside its specialised model or integration; there is nothing to set up per camera")
    caps, integ = _installed(db)
    miss_c, miss_i = requirements_met({"capabilities": uc.capabilities, "integrations": uc.integrations}, caps, integ)
    if miss_c or miss_i:
        need = [CAPABILITIES.get(c, c) for c in miss_c] + [INTEGRATIONS.get(i, i) for i in miss_i]
        raise HTTPException(409, "Not available yet. Needs: " + "; ".join(need))
    bad = set(body.params) - ALLOWED_PARAMS
    if bad:
        raise HTTPException(422, f"Unknown setting(s): {', '.join(sorted(bad))}")
    cfg = {**uc.rule, **body.params, "use_case": uc.key, "event_type": uc.key, "name": body.params.get("name") or uc.name}
    if body.polygon is not None:
        cfg["polygon"] = body.polygon
    if body.line is not None:
        cfg["line"] = body.line
    errs = validate_rule_config(cfg)
    if errs:
        raise HTTPException(422, "; ".join(errs))
    analytics = [a for a in (cam.analytics or []) if a.get("use_case") != uc.key] + [cfg]
    cam.analytics = analytics
    audit(db, user.username, "use_case_enabled", f"{uc.key} on {cam.name}", request=request, org_id=cam.location.org_id)
    return {"ok": True, "analytics": analytics}


@router.delete("/cameras/{cam_id}/use-cases/{key}")
def disable_use_case(cam_id: int, key: str, request: Request, user: User = Depends(require("manage_devices")),
                     db: Session = Depends(get_db)):
    cam = _camera(db, user, cam_id)
    cam.analytics = [a for a in (cam.analytics or []) if a.get("use_case") != key]
    audit(db, user.username, "use_case_disabled", f"{key} on {cam.name}", request=request, org_id=cam.location.org_id)
    return {"ok": True, "analytics": cam.analytics}


@router.get("/cameras/{cam_id}/snapshot.jpg")
def snapshot(cam_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    """A still frame for drawing zones. Not available for simulated cameras."""
    cam = _camera(db, user, cam_id)
    if cam.driver == "simulator" or not (cam.sub_stream_url or cam.rtsp_url) or not probes.ffprobe_available():
        raise HTTPException(404, "No picture available for this camera")
    url = probes.with_credentials(cam.sub_stream_url or cam.rtsp_url, cam.username, decrypt_secret(cam.password_enc))
    cmd = ["ffmpeg", "-v", "error", "-rtsp_transport", "tcp", "-i", url, "-frames:v", "1", "-vf", "scale=960:-2",
           "-f", "image2", "-c:v", "mjpeg", "-"]
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=15)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Camera did not send a picture in time")
    if p.returncode != 0 or not p.stdout:
        raise HTTPException(502, "Could not get a picture from the camera")
    return Response(p.stdout, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


# ------------------------------------------------- edge worker configuration ----
@router.get("/edge/config")
def edge_config(camera_id: int | None = None, x_edge_key: str = Header(...), db: Session = Depends(get_db)):
    """Cameras (with stream login) and their enabled use cases for an edge box,
    limited to its location and below. The key must be kept secret on the box."""
    from .ops import edge_device
    dev = edge_device(x_edge_key, db)
    loc = db.get(Location, dev.location_id)
    subtree = descendants(location_tree(db, loc.org_id), {dev.location_id})
    q = select(Camera).where(Camera.location_id.in_(subtree), Camera.enabled.is_(True))
    if camera_id:
        q = q.where(Camera.id == camera_id)
    out = []
    for c in db.scalars(q):
        if not c.analytics:
            continue
        out.append({"camera_id": c.id, "name": c.name,
                    "url": probes.with_credentials(c.sub_stream_url or c.rtsp_url, c.username, decrypt_secret(c.password_enc)),
                    "analytics": c.analytics})
    dev.last_seen = utcnow()
    db.commit()
    return {"edge": dev.name, "cameras": out, "rule_types": sorted(RULES)}
