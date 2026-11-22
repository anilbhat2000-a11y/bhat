"""Remote reboot and step-by-step troubleshooting for cameras and NVRs.

Reboot methods (standards first, vendor API as fallback):
  * ONVIF Device service  SystemReboot  (any ONVIF Profile S/T device)
  * Hikvision ISAPI       PUT /ISAPI/System/reboot   (Hikvision cameras and NVRs)
  * simulator             marks the device offline for ~2 minutes
STATUS: the ONVIF and ISAPI calls follow the published specifications but have
not been run against real hardware in this repository. Test on one device first.
"""
from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from urllib.parse import urlsplit

import httpx

from ..config import settings
from ..security import decrypt_secret
from . import drivers, probes


# ------------------------------------------------------------------ reboot --
@dataclass
class RebootResult:
    ok: bool
    method: str
    message: str


def _onvif_reboot(host: str, port: int, username: str, password: str) -> RebootResult:
    url = f"http://{host}:{port}/onvif/device_service"
    body = probes._soap("<tds:SystemReboot/>", probes.ws_username_token(username, password) if username else "")
    try:
        r = httpx.post(url, content=body, timeout=settings.probe_timeout_s + 4,
                       headers={"Content-Type": "application/soap+xml; charset=utf-8"})
    except httpx.HTTPError as e:
        return RebootResult(False, "onvif", f"could not reach ONVIF service: {e}")
    if r.status_code == 200:
        msg = ""
        try:
            el = probes._find(probes.ET.fromstring(r.text), "Message")
            msg = (el.text or "").strip() if el is not None else ""
        except probes.ET.ParseError:
            pass
        return RebootResult(True, "onvif", msg or "Reboot command accepted")
    if r.status_code in (400, 401, 500) and ("NotAuthorized" in r.text or r.status_code == 401):
        return RebootResult(False, "onvif", "ONVIF login refused: check the ONVIF user name and password")
    return RebootResult(False, "onvif", f"ONVIF returned HTTP {r.status_code}")


def _isapi_reboot(host: str, port: int, username: str, password: str) -> RebootResult:
    try:
        r = httpx.put(f"http://{host}:{port}/ISAPI/System/reboot", auth=httpx.DigestAuth(username, password),
                      timeout=settings.probe_timeout_s + 4)
    except httpx.HTTPError as e:
        return RebootResult(False, "isapi", f"could not reach device: {e}")
    if r.status_code == 200:
        return RebootResult(True, "isapi", "Reboot command accepted")
    if r.status_code == 401:
        return RebootResult(False, "isapi", "login refused: check the user name and password")
    return RebootResult(False, "isapi", f"device returned HTTP {r.status_code}")


def reboot_camera(cam) -> RebootResult:
    if cam.driver == "simulator":
        st = drivers.SIM._st("camera", cam.id)
        st["offline_until"] = time.time() + 120
        return RebootResult(True, "simulator", "Simulated reboot: device will be offline for about 2 minutes")
    pw = decrypt_secret(cam.password_enc)
    host = cam.host or (urlsplit(cam.rtsp_url).hostname if cam.rtsp_url else "")
    if not host:
        return RebootResult(False, "none", "No IP address configured for this camera")
    if cam.nvr_id and not cam.host:
        return RebootResult(False, "none", "This camera is reached through its NVR; reboot the NVR or add the camera's own IP address")
    res = _onvif_reboot(host, cam.onvif_port, cam.username, pw)
    if not res.ok and cam.vendor.lower() == "hikvision":
        alt = _isapi_reboot(host, 80 if cam.onvif_port in (80, 8000) else cam.onvif_port, cam.username, pw)
        if alt.ok:
            return alt
        res.message += f"; ISAPI: {alt.message}"
    return res


def reboot_nvr(nvr) -> RebootResult:
    if nvr.driver == "simulator":
        st = drivers.SIM._st("nvr", nvr.id)
        st["offline_until"] = time.time() + 120
        return RebootResult(True, "simulator", "Simulated reboot: NVR will be offline for about 2 minutes")
    pw = decrypt_secret(nvr.password_enc)
    if nvr.driver == "hikvision_isapi" or nvr.vendor.lower() == "hikvision":
        res = _isapi_reboot(nvr.host, nvr.http_port, nvr.username, pw)
        if res.ok:
            return res
        alt = _onvif_reboot(nvr.host, nvr.http_port, nvr.username, pw)
        if not alt.ok:
            alt.message = f"ISAPI: {res.message}; ONVIF: {alt.message}"
        return alt
    return _onvif_reboot(nvr.host, nvr.http_port, nvr.username, pw)


# -------------------------------------------------------------- troubleshoot -
@dataclass
class Step:
    name: str
    status: str  # pass | warn | fail | skip
    detail: str
    hint: str = ""
    ms: float | None = None


def _timed(fn):
    t0 = time.perf_counter()
    out = fn()
    return out, round((time.perf_counter() - t0) * 1000, 1)


def diagnose_camera(cam) -> list[dict]:
    if cam.driver == "simulator":
        r = drivers.SIM.camera(cam)
        return [asdict(Step("Simulated device", "pass" if r.online else "fail",
                            "This camera uses the simulator driver, so no network checks were run.",
                            "Change the health driver to 'generic' for a real camera."))]
    steps: list[Step] = []
    pw = decrypt_secret(cam.password_enc)
    url = cam.rtsp_url or cam.sub_stream_url
    if not url and not cam.host:
        return [asdict(Step("Configuration", "fail", "No RTSP URL and no IP address are set.",
                            "Edit the camera and add its stream URL or IP address."))]
    steps.append(Step("Configuration", "pass", f"Stream: {probes.redact(url) or '—'}; ONVIF host: {cam.host or '—'}"))
    timeout = settings.probe_timeout_s

    rtsp_ok = False
    if url:
        parts = urlsplit(url)
        host, port = parts.hostname or "", parts.port or 554
        (ok, lat, err), ms = _timed(lambda: probes.tcp_check(host, port, timeout))
        steps.append(Step(f"Network: reach {host}:{port}", "pass" if ok else "fail",
                          f"Connected in {lat} ms" if ok else f"No connection: {err}",
                          "" if ok else "Check the camera has power, its IP address is right, and the server can route "
                          "to the camera VLAN (firewall, VLAN, cabling).", ms))
        if ok:
            res, ms = _timed(lambda: probes.rtsp_options(url, timeout))
            rtsp_ok = res.reachable
            if res.status_code == 401:
                steps.append(Step("RTSP service", "pass", "RTSP server answered and asks for a login (normal).", "", ms))
            else:
                steps.append(Step("RTSP service", "pass" if res.reachable else "fail",
                                  f"Answered with status {res.status_code}" if res.reachable else res.error,
                                  "" if res.reachable else "RTSP may be turned off on the device or on a different port.", ms))
    else:
        steps.append(Step("RTSP service", "skip", "No stream URL configured."))

    if cam.host:
        (ok, lat, err), ms = _timed(lambda: probes.tcp_check(cam.host, cam.onvif_port, timeout))
        steps.append(Step(f"Network: ONVIF port {cam.onvif_port}", "pass" if ok else "fail",
                          f"Connected in {lat} ms" if ok else f"No connection: {err}",
                          "" if ok else "Check the ONVIF/HTTP port in the camera's network settings.", ms))
        if ok:
            info, err = probes.onvif_device_service(cam.host, cam.onvif_port, cam.username, pw, timeout)
            drift = info.get("time_drift_s")
            if drift is None:
                steps.append(Step("ONVIF clock", "warn", err or "Device did not return its time.",
                                  "ONVIF may be turned off on the device."))
            else:
                steps.append(Step("ONVIF clock", "pass" if abs(drift) <= 30 else "warn", f"Clock differs by {drift} s",
                                  "" if abs(drift) <= 30 else "Point the camera at the same NTP server as SentinelCore."))
            if info.get("serial") or info.get("model"):
                steps.append(Step("ONVIF login & identity", "pass",
                                  f"{info.get('manufacturer', '')} {info.get('model', '')}, serial {info.get('serial', '—')}, "
                                  f"firmware {info.get('firmware', '—')}"))
            elif cam.username:
                steps.append(Step("ONVIF login & identity", "fail", "The device refused the ONVIF login.",
                                  "Many cameras need a separate ONVIF user (for example Hikvision: Configuration → "
                                  "Network → Advanced → Integration Protocol). Check the user name and password."))
            else:
                steps.append(Step("ONVIF login & identity", "skip", "No user name configured."))
    if url and rtsp_ok:
        probe_url = probes.with_credentials(cam.sub_stream_url or url, cam.username, pw)
        (stats, err), ms = _timed(lambda: probes.probe_stream(probe_url))
        if stats.get("fps") is not None:
            ratio = stats["fps"] / (cam.target_fps or 25)
            steps.append(Step("Video stream", "pass" if ratio >= 0.6 else "warn",
                              f"{stats.get('codec', '?').upper()} {stats.get('width', '?')}×{stats.get('height', '?')}, "
                              f"{stats['fps']} fps (target {cam.target_fps}), {stats.get('bitrate_kbps', '?')} kbps",
                              "" if ratio >= 0.6 else "Low frame rate: check network bandwidth and the camera's encoding settings.", ms))
        else:
            hint = "Wrong user name or password for the stream." if "401" in err or "Unauthorized" in err else \
                   "Check the stream path; open it in VLC with the same login to compare."
            steps.append(Step("Video stream", "fail", probes.redact(err) or "No video received.", hint, ms))
        frame, err = probes.grab_gray_frame(probe_url)
        if frame:
            st = probes.image_stats(frame)
            flags = probes.classify_image(st, None, None, frame)
            bad = [k.replace("_", " ") for k, v in flags.items() if v]
            steps.append(Step("Picture check", "warn" if bad else "pass",
                              f"Brightness {st['brightness']}, contrast {st['contrast']}, sharpness {st['sharpness']}"
                              + (f" — {', '.join(bad)}" if bad else ""),
                              "Clean the lens, check focus, IR and that nothing covers the camera." if bad else ""))
    return [asdict(s) for s in steps]


def diagnose_nvr(nvr) -> list[dict]:
    if nvr.driver == "simulator":
        r = drivers.SIM.nvr(nvr)
        return [asdict(Step("Simulated device", "pass" if r.online else "fail",
                            "This NVR uses the simulator driver, so no network checks were run.",
                            "Change the health driver to 'tcp', 'onvif' or 'hikvision_isapi' for a real NVR."))]
    steps: list[Step] = []
    timeout = settings.probe_timeout_s
    for label, port in (("web/API", nvr.http_port), ("RTSP", nvr.rtsp_port)):
        (ok, lat, err), ms = _timed(lambda p=port: probes.tcp_check(nvr.host, p, timeout))
        steps.append(Step(f"Network: {label} port {port}", "pass" if ok else "fail",
                          f"Connected in {lat} ms" if ok else f"No connection: {err}",
                          "" if ok else "Check power, IP address, routing and firewall between the server and the NVR.", ms))
    if steps[0].status != "pass":
        return [asdict(s) for s in steps]
    reading, ms = _timed(lambda: drivers.read_nvr(nvr))
    d = reading.data
    if reading.error:
        steps.append(Step("Login / API", "fail", reading.error,
                          "Check the user name and password, and that the NVR's API (ISAPI/ONVIF) is enabled.", ms))
    elif d.get("model") or d.get("serial"):
        steps.append(Step("Login & identity", "pass",
                          f"{d.get('manufacturer', '')} {d.get('model', '')}, serial {d.get('serial', '—')}, "
                          f"firmware {d.get('firmware', '—')}", "", ms))
    else:
        steps.append(Step("Login & identity", "skip", "The 'tcp' driver does not log in. Use 'onvif' or 'hikvision_isapi' "
                          "to read model, serial number and disks."))
    if "disks" in d:
        bad = [k for k in d["disks"] if k.get("status") not in ("ok", "normal", "idle", "sleeping")]
        steps.append(Step("Disks", "fail" if bad else "pass",
                          f"{len(d['disks'])} disk(s), {d.get('storage_used_pct', '?')}% used"
                          + (f"; faulty: {', '.join('HDD ' + k['id'] + ' (' + k['status'] + ')' for k in bad)}" if bad else ""),
                          "Replace or re-format the faulty disk; recordings on it may be lost." if bad else ""))
    return [asdict(s) for s in steps]
