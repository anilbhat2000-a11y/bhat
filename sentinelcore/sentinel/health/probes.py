"""Low-level, vendor-neutral health probes.

Everything here uses open standards only:
  * RTSP OPTIONS (RFC 2326) over TCP to check that the stream server answers.
  * ffprobe/ffmpeg (FFmpeg CLI) to measure real FPS, bitrate, codec,
    resolution, and to grab a small frame for image-health checks.
  * ONVIF Device service GetSystemDateAndTime / GetDeviceInformation (SOAP).
No value is ever fabricated: if a probe cannot measure something it is left out.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import shutil
import socket
import subprocess
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit, urlunsplit

import httpx


# ---------------------------------------------------------------- RTSP -------
def with_credentials(url: str, username: str, password: str) -> str:
    """Insert user:pass into an rtsp:// URL unless it already carries them."""
    if not username or not url:
        return url
    parts = urlsplit(url)
    if parts.username:
        return url
    netloc = f"{quote(username, safe='')}:{quote(password, safe='')}@{parts.hostname}"
    if parts.port:
        netloc += f":{parts.port}"
    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))


def redact(url: str) -> str:
    parts = urlsplit(url)
    if not parts.password:
        return url
    netloc = f"{parts.username}:***@{parts.hostname}" + (f":{parts.port}" if parts.port else "")
    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))


@dataclass
class RtspResult:
    reachable: bool
    status_code: int | None = None
    latency_ms: float | None = None
    error: str = ""


def rtsp_options(url: str, timeout: float = 4.0) -> RtspResult:
    """Send RTSP OPTIONS and read the status line. 200 and 401 both mean the
    RTSP server is alive (401 = credentials required for OPTIONS)."""
    parts = urlsplit(url)
    host, port = parts.hostname, parts.port or 554
    if not host:
        return RtspResult(False, error="invalid RTSP URL")
    clean = urlunsplit((parts.scheme, f"{host}:{port}", parts.path or "/", parts.query, ""))
    req = f"OPTIONS {clean} RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: SentinelCore\r\n\r\n".encode()
    t0 = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout) as s:
            s.settimeout(timeout)
            s.sendall(req)
            data = s.recv(1024)
    except OSError as e:
        return RtspResult(False, error=f"connect failed: {e}")
    latency = (time.perf_counter() - t0) * 1000
    line = data.split(b"\r\n", 1)[0].decode(errors="replace")
    bits = line.split()
    if len(bits) >= 2 and bits[0].startswith("RTSP/") and bits[1].isdigit():
        code = int(bits[1])
        return RtspResult(code < 500, code, round(latency, 1), "" if code < 500 else line)
    return RtspResult(False, None, round(latency, 1), f"not an RTSP response: {line[:80]!r}")


def tcp_check(host: str, port: int, timeout: float = 4.0) -> tuple[bool, float | None, str]:
    t0 = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, round((time.perf_counter() - t0) * 1000, 1), ""
    except OSError as e:
        return False, None, str(e)


# ---------------------------------------------------------------- ffprobe ----
def ffprobe_available() -> bool:
    return shutil.which("ffprobe") is not None and shutil.which("ffmpeg") is not None


def stream_stats_from_ffprobe_json(doc: dict) -> dict:
    """Compute measured FPS and bitrate from ffprobe packet output."""
    out: dict = {}
    streams = doc.get("streams") or []
    if streams:
        s = streams[0]
        if s.get("codec_name"):
            out["codec"] = s["codec_name"]
        if s.get("width") and s.get("height"):
            out["width"], out["height"] = int(s["width"]), int(s["height"])
    pkts = [p for p in doc.get("packets") or [] if p.get("pts_time") not in (None, "N/A")]
    if len(pkts) >= 2:
        times = sorted(float(p["pts_time"]) for p in pkts)
        span = times[-1] - times[0]
        if span > 0:
            out["fps"] = round((len(times) - 1) / span, 2)
            total_bits = sum(int(p.get("size", 0)) for p in pkts) * 8
            out["bitrate_kbps"] = round(total_bits / span / 1000, 1)
    return out


def probe_stream(url: str, seconds: float = 3.0, timeout: float = 15.0) -> tuple[dict, str]:
    """Measure codec/resolution/fps/bitrate by reading `seconds` of video."""
    if not ffprobe_available():
        return {}, "ffprobe not installed"
    cmd = ["ffprobe", "-v", "error"]
    if url.startswith("rtsp://"):
        cmd += ["-rtsp_transport", "tcp"]
    cmd += ["-select_streams", "v:0", "-read_intervals", f"%+{seconds}",
            "-show_entries", "packet=size,pts_time:stream=codec_name,width,height",
            "-of", "json", url]
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=timeout, text=True)
    except subprocess.TimeoutExpired:
        return {}, "ffprobe timed out"
    if p.returncode != 0:
        return {}, (p.stderr.strip().splitlines() or ["ffprobe failed"])[-1][:200]
    try:
        return stream_stats_from_ffprobe_json(json.loads(p.stdout or "{}")), ""
    except json.JSONDecodeError:
        return {}, "ffprobe returned invalid JSON"


FRAME_W, FRAME_H = 160, 90


def grab_gray_frame(url: str, timeout: float = 15.0) -> tuple[bytes | None, str]:
    """Grab one frame scaled to 160x90 8-bit grayscale (14,400 bytes)."""
    if not ffprobe_available():
        return None, "ffmpeg not installed"
    cmd = ["ffmpeg", "-v", "error"]
    if url.startswith("rtsp://"):
        cmd += ["-rtsp_transport", "tcp"]
    cmd += ["-i", url, "-frames:v", "1", "-vf", f"scale={FRAME_W}:{FRAME_H},format=gray",
            "-f", "rawvideo", "-"]
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, "ffmpeg timed out"
    if p.returncode != 0 or len(p.stdout) < FRAME_W * FRAME_H:
        return None, (p.stderr.decode(errors="replace").strip().splitlines() or ["frame grab failed"])[-1][:200]
    return p.stdout[: FRAME_W * FRAME_H], ""


# ---------------------------------------------------------- image health -----
def image_stats(frame: bytes, w: int = FRAME_W, h: int = FRAME_H) -> dict:
    """Brightness (0-255 mean), contrast (std dev) and sharpness (variance of
    the 4-neighbour Laplacian). Low sharpness => blurred/defocused/covered."""
    n = w * h
    mean = sum(frame) / n
    var = sum((p - mean) ** 2 for p in frame) / n
    lap_vals = []
    for y in range(1, h - 1):
        row = y * w
        for x in range(1, w - 1):
            i = row + x
            lap_vals.append(4 * frame[i] - frame[i - 1] - frame[i + 1] - frame[i - w] - frame[i + w])
    lm = sum(lap_vals) / len(lap_vals)
    lap_var = sum((v - lm) ** 2 for v in lap_vals) / len(lap_vals)
    return {"brightness": round(mean, 1), "contrast": round(var ** 0.5, 1), "sharpness": round(lap_var, 1)}


def frame_difference(a: bytes, b: bytes) -> float:
    """Mean absolute pixel difference (0-255)."""
    return sum(abs(x - y) for x, y in zip(a, b)) / max(1, len(a))


# Thresholds are starting points; tune per location with the evaluation screen.
IMAGE_THRESHOLDS = {"dark": 25.0, "bright": 235.0, "blank_contrast": 4.0, "blur_sharpness": 15.0,
                    "frozen_diff": 0.3, "view_changed_diff": 45.0}


def classify_image(stats: dict, prev: bytes | None, ref: bytes | None, cur: bytes) -> dict:
    t = IMAGE_THRESHOLDS
    flags = {
        "too_dark": stats["brightness"] < t["dark"],
        "too_bright": stats["brightness"] > t["bright"],
        "blank": stats["contrast"] < t["blank_contrast"],
        "blurred": stats["sharpness"] < t["blur_sharpness"] and stats["contrast"] >= t["blank_contrast"],
    }
    if prev is not None:
        flags["frozen"] = frame_difference(prev, cur) < t["frozen_diff"]
    if ref is not None:
        flags["view_changed"] = frame_difference(ref, cur) > t["view_changed_diff"]
    return flags


# ---------------------------------------------------------------- ONVIF ------
SOAP_ENV = "http://www.w3.org/2003/05/soap-envelope"
WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
WSU = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
PW_DIGEST = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest"


def ws_username_token(username: str, password: str, nonce: bytes | None = None, created: str | None = None) -> str:
    """WS-Security UsernameToken with PasswordDigest = B64(SHA1(nonce+created+password))."""
    nonce = nonce or os.urandom(16)
    created = created or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    digest = base64.b64encode(hashlib.sha1(nonce + created.encode() + password.encode()).digest()).decode()
    return (f'<wsse:Security xmlns:wsse="{WSSE}" xmlns:wsu="{WSU}"><wsse:UsernameToken>'
            f"<wsse:Username>{_xml_escape(username)}</wsse:Username>"
            f'<wsse:Password Type="{PW_DIGEST}">{digest}</wsse:Password>'
            f"<wsse:Nonce>{base64.b64encode(nonce).decode()}</wsse:Nonce>"
            f"<wsu:Created>{created}</wsu:Created></wsse:UsernameToken></wsse:Security>")


def _xml_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _soap(body: str, header: str = "") -> str:
    return (f'<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="{SOAP_ENV}" '
            f'xmlns:tds="http://www.onvif.org/ver10/device/wsdl">'
            f"<s:Header>{header}</s:Header><s:Body>{body}</s:Body></s:Envelope>")


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _find(el: ET.Element, *names: str) -> ET.Element | None:
    cur: ET.Element | None = el
    for name in names:
        if cur is None:
            return None
        cur = next((c for c in cur.iter() if _local(c.tag) == name and c is not cur), None)
    return cur


def parse_onvif_datetime(xml_text: str) -> datetime | None:
    root = ET.fromstring(xml_text)
    utc = _find(root, "UTCDateTime")
    if utc is None:
        return None
    vals = {}
    for c in utc.iter():
        if _local(c.tag) in {"Year", "Month", "Day", "Hour", "Minute", "Second"} and c.text:
            vals[_local(c.tag)] = int(c.text)
    try:
        return datetime(vals["Year"], vals["Month"], vals["Day"], vals["Hour"], vals["Minute"], vals["Second"],
                        tzinfo=timezone.utc)
    except KeyError:
        return None


def parse_onvif_device_info(xml_text: str) -> dict:
    root = ET.fromstring(xml_text)
    out = {}
    for name, key in (("Manufacturer", "manufacturer"), ("Model", "model"),
                      ("FirmwareVersion", "firmware"), ("SerialNumber", "serial")):
        el = _find(root, name)
        if el is not None and el.text:
            out[key] = el.text.strip()
    return out


def onvif_device_service(host: str, port: int, username: str, password: str, timeout: float = 4.0) -> tuple[dict, str]:
    url = f"http://{host}:{port}/onvif/device_service"
    headers = {"Content-Type": "application/soap+xml; charset=utf-8"}
    out: dict = {}
    try:
        with httpx.Client(timeout=timeout) as c:
            r = c.post(url, content=_soap("<tds:GetSystemDateAndTime/>"), headers=headers)
            if r.status_code == 200:
                cam_time = parse_onvif_datetime(r.text)
                if cam_time:
                    out["time_drift_s"] = round((cam_time - datetime.now(timezone.utc)).total_seconds(), 1)
            if username:
                r = c.post(url, content=_soap("<tds:GetDeviceInformation/>", ws_username_token(username, password)),
                           headers=headers)
                if r.status_code == 200:
                    out.update(parse_onvif_device_info(r.text))
    except (httpx.HTTPError, ET.ParseError) as e:
        return out, f"onvif: {e}"
    return out, ""
