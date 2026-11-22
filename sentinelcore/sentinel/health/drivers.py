"""Health drivers. A driver turns a device record into a HealthReading.

Rule: a driver puts a key in `data` only when the device actually reported or
the probe actually measured it. Dashboards show missing keys as
"Not supported by device".

Built-in drivers
  camera: generic   - RTSP OPTIONS + ffprobe stream stats + frame image health + ONVIF time/info
          rtsp      - RTSP OPTIONS only (cheap; for very large fleets)
          simulator - synthetic data for demos/tests (clearly marked source="simulator")
  nvr:    tcp       - TCP reachability of the NVR web port
          hikvision_isapi - Hikvision ISAPI device info + HDD status (verify on your firmware)
          simulator
Add vendor drivers (battery cameras, Dahua, UPS via SNMP...) by registering in
CAMERA_DRIVERS / NVR_DRIVERS.
"""
from __future__ import annotations

import math
import random
import threading
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

import httpx

from ..config import settings
from ..security import decrypt_secret
from . import probes


@dataclass
class HealthReading:
    online: bool
    data: dict = field(default_factory=dict)
    error: str = ""


# --------------------------------------------------------------------- camera
_frame_cache: dict[int, dict[str, bytes]] = {}
_frame_lock = threading.Lock()


def camera_generic(cam, deep: bool = True) -> HealthReading:
    url = cam.rtsp_url or cam.sub_stream_url
    if not url:
        return HealthReading(False, error="no RTSP URL configured")
    pw = decrypt_secret(cam.password_enc)
    timeout = settings.probe_timeout_s
    res = probes.rtsp_options(url, timeout)
    if not res.reachable:
        return HealthReading(False, error=res.error)
    data: dict = {"latency_ms": res.latency_ms, "target_fps": cam.target_fps}
    errors: list[str] = []
    if deep:
        # Use the sub-stream for health checks when available (cheaper to decode).
        probe_url = probes.with_credentials(cam.sub_stream_url or url, cam.username, pw)
        stats, err = probes.probe_stream(probe_url)
        if err:
            errors.append(probes.redact(err))
        data.update(stats)
        frame, err = probes.grab_gray_frame(probe_url)
        if frame:
            st = probes.image_stats(frame)
            with _frame_lock:
                cache = _frame_cache.setdefault(cam.id, {})
                flags = probes.classify_image(st, cache.get("prev"), cache.get("ref"), frame)
                cache["prev"] = frame
                cache.setdefault("ref", frame)
            data.update(st)
            data.update(flags)
        elif err:
            errors.append(probes.redact(err))
    if cam.host:
        info, err = probes.onvif_device_service(cam.host, cam.onvif_port, cam.username, pw, timeout)
        data.update(info)
        if err:
            errors.append(err)
    return HealthReading(True, data, "; ".join(errors))


def camera_rtsp(cam) -> HealthReading:
    return camera_generic(cam, deep=False)


def reset_reference_frame(camera_id: int) -> None:
    with _frame_lock:
        _frame_cache.get(camera_id, {}).pop("ref", None)


# ------------------------------------------------------------------------ NVR
def nvr_tcp(nvr) -> HealthReading:
    ok, latency, err = probes.tcp_check(nvr.host, nvr.http_port, settings.probe_timeout_s)
    return HealthReading(ok, {"latency_ms": latency} if ok else {}, err)


def parse_isapi_storage(xml_text: str) -> list[dict]:
    """Parse ISAPI /ContentMgmt/Storage. Capacity/freeSpace are in MB."""
    root = ET.fromstring(xml_text)
    disks = []
    for el in root.iter():
        if el.tag.rsplit("}", 1)[-1] != "hdd":
            continue
        d = {c.tag.rsplit("}", 1)[-1]: (c.text or "").strip() for c in el}
        disk = {"id": d.get("id", ""), "status": d.get("status", "unknown").lower()}
        try:
            disk["capacity_gb"] = round(int(d["capacity"]) / 1024, 1)
            disk["free_gb"] = round(int(d["freeSpace"]) / 1024, 1)
        except (KeyError, ValueError):
            pass
        disks.append(disk)
    return disks


def parse_isapi_device_info(xml_text: str) -> dict:
    root = ET.fromstring(xml_text)
    out = {}
    for el in root.iter():
        name = el.tag.rsplit("}", 1)[-1]
        if name == "model" and el.text:
            out["model"] = el.text.strip()
        elif name == "firmwareVersion" and el.text:
            out["firmware"] = el.text.strip()
    return out


def summarize_disks(disks: list[dict]) -> dict:
    out: dict = {"disks": disks, "disk_count": len(disks)}
    cap = sum(d.get("capacity_gb", 0) for d in disks)
    free = sum(d.get("free_gb", 0) for d in disks)
    if cap:
        out["storage_total_gb"] = round(cap, 1)
        out["storage_used_pct"] = round(100 * (cap - free) / cap, 1)
    # "ok" is healthy; anything else (error, unformatted, smartFailed, ...) is a fault.
    out["disk_errors"] = sum(1 for d in disks if d.get("status") not in ("ok", "normal", "idle", "sleeping"))
    return out


def nvr_hikvision_isapi(nvr) -> HealthReading:
    """Hikvision ISAPI. Endpoints used:
      GET /ISAPI/System/deviceInfo
      GET /ISAPI/ContentMgmt/Storage
    These are documented in Hikvision's ISAPI guide; confirm on your NVR model
    and firmware before relying on them (see docs/VERIFICATION.md)."""
    base = f"http://{nvr.host}:{nvr.http_port}"
    auth = httpx.DigestAuth(nvr.username, decrypt_secret(nvr.password_enc))
    try:
        with httpx.Client(timeout=settings.probe_timeout_s, auth=auth) as c:
            t0 = time.perf_counter()
            r = c.get(base + "/ISAPI/System/deviceInfo")
            latency = round((time.perf_counter() - t0) * 1000, 1)
            if r.status_code == 401:
                return HealthReading(True, {"latency_ms": latency}, "authentication failed")
            r.raise_for_status()
            data = {"latency_ms": latency, **parse_isapi_device_info(r.text)}
            r = c.get(base + "/ISAPI/ContentMgmt/Storage")
            if r.status_code == 200:
                data.update(summarize_disks(parse_isapi_storage(r.text)))
            return HealthReading(True, data)
    except httpx.HTTPStatusError as e:
        return HealthReading(True, {}, f"HTTP {e.response.status_code}")
    except (httpx.HTTPError, ET.ParseError) as e:
        return HealthReading(False, error=str(e))


# ------------------------------------------------------------------ simulator
class _Sim:
    """Smooth, repeatable synthetic telemetry so dashboards can be demoed
    without hardware. Every simulated reading carries source="simulator"."""

    def __init__(self) -> None:
        self.state: dict[tuple[str, int], dict] = {}
        self.lock = threading.Lock()

    def _st(self, kind: str, dev_id: int) -> dict:
        key = (kind, dev_id)
        if key not in self.state:
            r = random.Random(f"{kind}-{dev_id}")
            self.state[key] = {"rng": r, "battery": r.uniform(35, 100), "offline_until": 0.0,
                               "flaky": r.random() < 0.12, "used": r.uniform(40, 97),
                               "bad_disk": r.random() < 0.15, "drift": r.uniform(-3, 3)}
        return self.state[key]

    def camera(self, cam) -> HealthReading:
        with self.lock:
            s = self._st("camera", cam.id)
            r: random.Random = s["rng"]
            now = time.time()
            if now < s["offline_until"]:
                return HealthReading(False, {"source": "simulator"}, "simulated: no response")
            if r.random() < (0.04 if s["flaky"] else 0.004):
                s["offline_until"] = now + r.uniform(120, 900)
                return HealthReading(False, {"source": "simulator"}, "simulated: no response")
            target = cam.target_fps or 25
            fps = max(0.0, target - abs(r.gauss(0, 0.6 if not s["flaky"] else 4)))
            data = {"source": "simulator", "latency_ms": round(abs(r.gauss(18, 8)) + 2, 1),
                    "target_fps": target, "fps": round(fps, 2),
                    "bitrate_kbps": round(r.gauss(2048 if fps > 10 else 900, 150), 1),
                    "codec": "h265" if cam.id % 3 else "h264", "width": 1920, "height": 1080,
                    "packet_loss_pct": round(abs(r.gauss(0.1, 0.6 if s["flaky"] else 0.1)), 2),
                    "time_drift_s": round(s["drift"] + r.gauss(0, 0.2), 1),
                    "brightness": round(r.uniform(70, 160), 1), "contrast": round(r.uniform(25, 60), 1),
                    "sharpness": round(r.uniform(60, 400), 1), "firmware": "V5.7.3-sim"}
            hour = time.localtime().tm_hour
            data.update({"too_dark": False, "too_bright": False, "blank": False,
                         "blurred": s["flaky"] and r.random() < 0.2, "frozen": False,
                         "view_changed": r.random() < 0.003})
            if cam.power_type in ("battery", "solar"):
                daylight = 6 <= hour <= 18
                solar_w = max(0.0, 8 * math.sin(math.pi * (hour - 6) / 12)) if cam.power_type == "solar" and daylight else 0.0
                s["battery"] = min(100.0, max(0.0, s["battery"] - r.uniform(0.05, 0.4) + solar_w * 0.08))
                b = s["battery"]
                data.update({"battery_pct": round(b, 1), "battery_voltage": round(10.8 + 1.8 * b / 100, 2),
                             "charging": solar_w > 1, "battery_temp_c": round(r.gauss(34, 3), 1),
                             "signal_dbm": round(r.gauss(-78, 6)), "est_hours_left": round(b * 0.9, 1)})
                if cam.power_type == "solar":
                    data["solar_w"] = round(solar_w, 1)
            return HealthReading(True, data)

    def nvr(self, nvr) -> HealthReading:
        with self.lock:
            s = self._st("nvr", nvr.id)
            r: random.Random = s["rng"]
            s["used"] = min(99.5, s["used"] + r.uniform(0, 0.02))
            ndisk = 2 if nvr.channels <= 16 else 4
            disks = []
            for i in range(ndisk):
                status = "error" if (s["bad_disk"] and i == ndisk - 1) else "ok"
                cap = 4096.0
                disks.append({"id": str(i + 1), "status": status, "capacity_gb": cap,
                              "free_gb": round(cap * (1 - s["used"] / 100), 1)})
            data = {"source": "simulator", "latency_ms": round(abs(r.gauss(12, 5)) + 1, 1),
                    "model": nvr.model or "NVR-SIM", "firmware": "V4.30-sim",
                    "cpu_pct": round(r.uniform(15, 70), 1), "temp_c": round(r.gauss(46, 4), 1),
                    "retention_days": round(max(1.0, 30 * (1.2 - s["used"] / 100) + r.gauss(0, 0.5)), 1),
                    "recording_channels": nvr.channels - (1 if s["bad_disk"] else 0),
                    "total_channels": nvr.channels}
            data.update(summarize_disks(disks))
            return HealthReading(True, data)


SIM = _Sim()

CAMERA_DRIVERS = {"generic": camera_generic, "rtsp": camera_rtsp, "simulator": SIM.camera}
NVR_DRIVERS = {"tcp": nvr_tcp, "hikvision_isapi": nvr_hikvision_isapi, "simulator": SIM.nvr}


def read_camera(cam) -> HealthReading:
    fn = CAMERA_DRIVERS.get(cam.driver)
    if fn is None:
        return HealthReading(False, error=f"unknown driver {cam.driver!r}")
    try:
        return fn(cam)
    except Exception as e:  # a broken driver must never stop the collector
        return HealthReading(False, error=f"driver error: {e}")


def read_nvr(nvr) -> HealthReading:
    fn = NVR_DRIVERS.get(nvr.driver)
    if fn is None:
        return HealthReading(False, error=f"unknown driver {nvr.driver!r}")
    try:
        return fn(nvr)
    except Exception as e:
        return HealthReading(False, error=f"driver error: {e}")
