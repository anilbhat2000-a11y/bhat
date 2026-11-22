"""Bulk camera onboarding: ONVIF WS-Discovery, CSV import, NVR channel import."""
from __future__ import annotations

import csv
import io
import socket
import time
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import NVR, POWER_TYPES, Camera, Location
from .security import encrypt_secret

# ----------------------------------------------------------- WS-Discovery ----
WSD_ADDR = ("239.255.255.250", 3702)


def probe_message(msg_id: str | None = None) -> bytes:
    msg_id = msg_id or f"uuid:{uuid.uuid4()}"
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" '
        'xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" '
        'xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
        'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
        f"<e:Header><w:MessageID>{msg_id}</w:MessageID>"
        "<w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>"
        "<w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>"
        "<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>"
    ).encode()


def parse_probe_match(xml_bytes: bytes) -> dict | None:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return None
    def first(name):
        return next((el.text.strip() for el in root.iter() if el.tag.rsplit("}", 1)[-1] == name and el.text), "")
    xaddrs = first("XAddrs").split()
    if not xaddrs:
        return None
    scopes = first("Scopes").split()
    info = {"xaddrs": xaddrs, "endpoint": first("Address"), "scopes": scopes}
    u = urlsplit(xaddrs[0])
    info["host"], info["onvif_port"] = u.hostname or "", u.port or 80
    for s in scopes:
        for key, prefix in (("name", "onvif://www.onvif.org/name/"), ("hardware", "onvif://www.onvif.org/hardware/"),
                            ("location", "onvif://www.onvif.org/location/")):
            if s.startswith(prefix):
                from urllib.parse import unquote
                info[key] = unquote(s[len(prefix):])
    return info


def discover(timeout: float = 3.0, iface_ip: str = "") -> list[dict]:
    """Send a WS-Discovery Probe for ONVIF NetworkVideoTransmitters on the
    local subnet and collect ProbeMatches. Multicast does not cross routers;
    run discovery per VLAN or import by CSV for routed networks."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    if iface_ip:
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(iface_ip))
    sock.settimeout(0.5)
    found: dict[str, dict] = {}
    try:
        sock.sendto(probe_message(), WSD_ADDR)
        end = time.time() + timeout
        while time.time() < end:
            try:
                data, _ = sock.recvfrom(65535)
            except socket.timeout:
                continue
            m = parse_probe_match(data)
            if m:
                found[m["endpoint"] or m["xaddrs"][0]] = m
    finally:
        sock.close()
    return list(found.values())


# ------------------------------------------------------------- RTSP templates
# Widely published default RTSP paths. Confirm per model (docs/VERIFICATION.md).
RTSP_TEMPLATES = {
    "hikvision": {"main": "rtsp://{host}:{port}/Streaming/Channels/{ch}01",
                  "sub": "rtsp://{host}:{port}/Streaming/Channels/{ch}02"},
    "dahua": {"main": "rtsp://{host}:{port}/cam/realmonitor?channel={ch}&subtype=0",
              "sub": "rtsp://{host}:{port}/cam/realmonitor?channel={ch}&subtype=1"},
    "cpplus": {"main": "rtsp://{host}:{port}/cam/realmonitor?channel={ch}&subtype=0",
               "sub": "rtsp://{host}:{port}/cam/realmonitor?channel={ch}&subtype=1"},
}


def channel_urls(vendor: str, host: str, port: int, ch: int, main_tpl: str = "", sub_tpl: str = "") -> tuple[str, str]:
    tpl = RTSP_TEMPLATES.get(vendor.lower(), {})
    main_tpl = main_tpl or tpl.get("main", "")
    sub_tpl = sub_tpl or tpl.get("sub", "")
    if not main_tpl:
        raise ValueError(f"no RTSP template known for vendor {vendor!r}; supply main_template")
    fmt = {"host": host, "port": port, "ch": ch}
    return main_tpl.format(**fmt), (sub_tpl.format(**fmt) if sub_tpl else "")


def import_nvr_channels(db: Session, nvr: NVR, channels: list[int] | None = None, main_tpl: str = "",
                        sub_tpl: str = "", driver: str = "generic", name_prefix: str = "") -> list[Camera]:
    channels = channels or list(range(1, nvr.channels + 1))
    existing = set(db.scalars(select(Camera.channel).where(Camera.nvr_id == nvr.id)).all())
    created = []
    for ch in channels:
        if ch in existing:
            continue
        main, sub = channel_urls(nvr.vendor, nvr.host, nvr.rtsp_port, ch, main_tpl, sub_tpl)
        cam = Camera(location_id=nvr.location_id, nvr_id=nvr.id, channel=ch, name=f"{name_prefix or nvr.name} CH{ch:02d}",
                     vendor=nvr.vendor, rtsp_url=main, sub_stream_url=sub, username=nvr.username,
                     password_enc=nvr.password_enc, driver=driver if nvr.driver != "simulator" else "simulator")
        db.add(cam)
        created.append(cam)
    db.flush()
    return created


# ------------------------------------------------------------------- CSV ------
CSV_COLUMNS = ["name", "location", "host", "rtsp_url", "sub_stream_url", "vendor", "model", "username", "password",
               "power_type", "building", "floor", "zone", "onvif_port", "target_fps", "driver", "tags"]
REQUIRED = ["name", "location"]


def csv_template() -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_COLUMNS)
    w.writerow(["Gate 1 Entry", "Corporate Office / West Region / Mumbai Branch", "192.168.10.21",
                "rtsp://192.168.10.21:554/Streaming/Channels/101", "rtsp://192.168.10.21:554/Streaming/Channels/102",
                "hikvision", "DS-2CD2143G2", "admin", "", "poe", "Main", "G", "Gate", "80", "25", "generic", "perimeter;gate"])
    return buf.getvalue()


def location_resolver(db: Session, allowed: set[int] | None):
    """CSV rows name their location by code, by full path ("Corporate / West / Mumbai Branch")
    or by plain name when that name is unique among the locations the user can see."""
    from .security import location_path
    q = select(Location)
    if allowed is not None:
        q = q.where(Location.id.in_(allowed or {-1}))
    visible = db.scalars(q).all()
    trees: dict[int, dict] = {}
    for loc in db.scalars(select(Location).where(Location.org_id.in_({l.org_id for l in visible} or {-1}))):
        trees.setdefault(loc.org_id, {})[loc.id] = loc
    by_code, by_path, by_name = {}, {}, {}
    for loc in visible:
        if loc.code:
            by_code.setdefault(loc.code.lower(), []).append(loc)
        by_path.setdefault(location_path(trees[loc.org_id], loc.id).lower(), []).append(loc)
        by_name.setdefault(loc.name.lower(), []).append(loc)

    def resolve(ref: str):
        key = " / ".join(p.strip() for p in ref.split("/")).lower()
        for table in (by_code, by_path, by_name):
            hits = table.get(key)
            if hits and len(hits) == 1:
                return hits[0], ""
            if hits:
                return None, f"location {ref!r} matches {len(hits)} locations; use its code or full path"
        return None, f"unknown location {ref!r} (or no permission)"
    return resolve


def import_csv(db: Session, text: str, allowed_sites: set[int] | None, dry_run: bool = False) -> dict:
    """Validate every row first; import only if there are no errors (all-or-nothing)."""
    reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
    missing = [c for c in REQUIRED if c not in (reader.fieldnames or [])]
    if missing:
        return {"imported": 0, "errors": [{"row": 1, "error": f"missing column(s): {', '.join(missing)}"}]}
    resolve = location_resolver(db, allowed_sites)
    errors, rows = [], []
    seen = set()
    for i, raw in enumerate(reader, start=2):
        row = {k: (v or "").strip() for k, v in raw.items() if k}
        if not any(row.values()):
            continue
        errs = []
        for c in REQUIRED:
            if not row.get(c):
                errs.append(f"{c} is required")
        location = None
        if row.get("location"):
            location, err = resolve(row["location"])
            if err:
                errs.append(err)
        if not row.get("rtsp_url") and not row.get("host"):
            errs.append("rtsp_url or host is required")
        if row.get("rtsp_url") and not row["rtsp_url"].startswith("rtsp://"):
            errs.append("rtsp_url must start with rtsp://")
        pt = row.get("power_type") or "poe"
        if pt not in POWER_TYPES:
            errs.append(f"power_type must be one of {', '.join(POWER_TYPES)}")
        for num in ("onvif_port", "target_fps"):
            if row.get(num):
                try:
                    float(row[num])
                except ValueError:
                    errs.append(f"{num} must be a number")
        key = (row.get("location", "").lower(), row.get("name", "").lower())
        if key in seen:
            errs.append("duplicate name for this location in file")
        seen.add(key)
        if errs:
            errors.append({"row": i, "error": "; ".join(errs)})
        else:
            rows.append((row, location))
    if errors or dry_run:
        return {"imported": 0, "valid_rows": len(rows), "errors": errors, "dry_run": dry_run,
                "location_ids": sorted({loc.id for _, loc in rows})}
    for row, location in rows:
        db.add(Camera(
            location_id=location.id, name=row["name"], host=row.get("host", ""), rtsp_url=row.get("rtsp_url", ""),
            sub_stream_url=row.get("sub_stream_url", ""), vendor=row.get("vendor") or "generic",
            model=row.get("model", ""), username=row.get("username", ""),
            password_enc=encrypt_secret(row.get("password", "")), power_type=row.get("power_type") or "poe",
            building=row.get("building", ""), floor=row.get("floor", ""), zone=row.get("zone", ""),
            onvif_port=int(float(row.get("onvif_port") or 80)), target_fps=float(row.get("target_fps") or 25),
            driver=row.get("driver") or "generic", tags=[t for t in row.get("tags", "").split(";") if t]))
    db.flush()
    return {"imported": len(rows), "errors": [], "location_ids": sorted({loc.id for _, loc in rows})}
