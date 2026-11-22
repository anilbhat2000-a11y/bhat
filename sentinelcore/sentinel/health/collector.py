"""Background health collector: polls every enabled camera and NVR, stores the
latest state and the metric time series, and runs the alert engine."""
from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import SessionLocal
from ..models import NVR, Camera, DeviceState, HealthMetric, utcnow
from . import alerts, drivers
from .. import notify

log = logging.getLogger("sentinel.collector")
_pool = ThreadPoolExecutor(max_workers=32, thread_name_prefix="probe")


IDENTITY_KEYS = {"manufacturer": "manufacturer", "model": "model", "serial": "serial_number",
                 "firmware": "firmware", "mac": "mac_address"}


def record_identity(device, data: dict, now) -> bool:
    """Copy make/model/serial/firmware/MAC reported by the device onto its record."""
    seen = False
    for src, field in IDENTITY_KEYS.items():
        v = data.get(src)
        if isinstance(v, str) and v.strip():
            seen = True
            if getattr(device, field) != v.strip()[:80]:
                setattr(device, field, v.strip()[:80])
    if seen:
        device.info_updated_at = now
    return seen


def store_reading(db: Session, device_type: str, device, reading: drivers.HealthReading, now=None) -> list:
    now = now or utcnow()
    st = db.get(DeviceState, (device_type, device.id))
    if st is None:
        st = DeviceState(device_type=device_type, device_id=device.id)
        db.add(st)
    st.online = reading.online
    st.last_checked = now
    st.error = reading.error
    if reading.online:
        st.last_seen = now
        st.data = reading.data
    else:
        # Keep the last known values (e.g. last battery level) but mark offline.
        st.data = {**(st.data or {}), **reading.data}
    record_identity(device, reading.data if reading.online else {}, now)
    values = alerts.derived_metrics(reading.data if reading.online else {}, reading.online)
    for k, v in values.items():
        db.add(HealthMetric(ts=now, device_type=device_type, device_id=device.id, key=k, value=v))
    return alerts.evaluate(db, device_type, device.id, device.location_id, device.name, values, now)


def collect_once(db: Session) -> dict:
    cams = db.scalars(select(Camera).where(Camera.enabled.is_(True))).all()
    nvrs = db.scalars(select(NVR).where(NVR.enabled.is_(True))).all()
    cam_results = list(_pool.map(drivers.read_camera, cams))
    nvr_results = list(_pool.map(drivers.read_nvr, nvrs))
    now = utcnow()
    opened = []
    for cam, r in zip(cams, cam_results):
        opened += store_reading(db, "camera", cam, r, now)
    for nvr, r in zip(nvrs, nvr_results):
        opened += store_reading(db, "nvr", nvr, r, now)
    db.commit()
    return {"cameras": len(cams), "nvrs": len(nvrs), "alerts_opened": len(opened)}


def prune(db: Session) -> int:
    cutoff = utcnow() - timedelta(days=settings.metric_retention_days)
    n = db.execute(delete(HealthMetric).where(HealthMetric.ts < cutoff)).rowcount
    db.commit()
    return n or 0


async def run_forever(stop: asyncio.Event) -> None:
    loop = asyncio.get_running_loop()
    ticks = 0
    while not stop.is_set():
        def _work():
            with SessionLocal() as db:
                res = collect_once(db)
                res["notifications"] = notify.dispatch(db)
                if ticks % 120 == 0:
                    prune(db)
                return res
        try:
            res = await loop.run_in_executor(None, _work)
            log.info("health cycle: %s", res)
        except Exception:
            log.exception("health cycle failed")
        ticks += 1
        try:
            await asyncio.wait_for(stop.wait(), timeout=settings.collect_interval_s)
        except asyncio.TimeoutError:
            pass
