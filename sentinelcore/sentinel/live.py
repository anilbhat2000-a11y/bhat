"""Live view: converts a camera's RTSP stream into an MJPEG stream any browser
can show in an <img>, using FFmpeg, at a quality the admin allows.

Quality presets trade picture detail for data. Low and moderate read the
camera's sub-stream (already smaller), high reads the main stream. The data
rates are rough guides: MJPEG size depends heavily on the scene.
For many simultaneous viewers, put a media server (e.g. MediaMTX) in front.
"""
from __future__ import annotations

import asyncio
import shutil

from .config import settings
from .health import probes
from .security import decrypt_secret

QUALITY = {
    "low": {"label": "Low", "width": 640, "fps": 5, "q": 12, "stream": "sub", "approx": "about 0.3–0.6 Mbps"},
    "moderate": {"label": "Moderate", "width": 960, "fps": 10, "q": 7, "stream": "sub", "approx": "about 1–2 Mbps"},
    "high": {"label": "High", "width": 1920, "fps": 15, "q": 3, "stream": "main", "approx": "about 4–8 Mbps"},
}
RANK = {"low": 0, "moderate": 1, "high": 2}
BOUNDARY = "ffmpeg"  # FFmpeg's mpjpeg muxer default
_active = 0
_lock = asyncio.Lock()


def max_quality(cam) -> str:
    q = cam.live_quality or (cam.location.org.live_quality if cam.location and cam.location.org else "") or "moderate"
    return q if q in QUALITY else "moderate"


def choose_quality(cam, requested: str | None) -> str:
    """The requested quality, but never above what the admin allows for this camera."""
    cap = max_quality(cam)
    if requested not in QUALITY:
        return cap
    return requested if RANK[requested] <= RANK[cap] else cap


def ffmpeg_command(cam, quality: str) -> list[str]:
    p = QUALITY[quality]
    out = ["-an", "-vf", f"fps={p['fps']},scale='min({p['width']},iw)':-2", "-q:v", str(p["q"]),
           "-f", "mpjpeg", "-"]
    if cam.driver == "simulator":
        h = p["width"] * 9 // 16
        return ["ffmpeg", "-v", "error", "-re", "-f", "lavfi", "-i", f"testsrc2=size={p['width']}x{h}:rate={p['fps']}", *out]
    main, sub = cam.rtsp_url, cam.sub_stream_url
    url = (sub or main) if p["stream"] == "sub" else (main or sub)
    url = probes.with_credentials(url, cam.username, decrypt_secret(cam.password_enc))
    return ["ffmpeg", "-v", "error", "-rtsp_transport", "tcp", "-i", url, *out]


def available() -> bool:
    return shutil.which("ffmpeg") is not None


async def try_reserve() -> bool:
    global _active
    async with _lock:
        if _active >= settings.max_live_streams:
            return False
        _active += 1
        return True


async def release() -> None:
    global _active
    async with _lock:
        _active = max(0, _active - 1)


async def mjpeg_stream(cmd: list[str], max_seconds: int):
    """Yields MJPEG bytes until the viewer leaves, FFmpeg stops, or the time limit passes."""
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    loop = asyncio.get_running_loop()
    deadline = loop.time() + max_seconds
    try:
        while loop.time() < deadline:
            try:
                chunk = await asyncio.wait_for(proc.stdout.read(65536), timeout=15)
            except asyncio.TimeoutError:
                break  # camera stopped sending pictures
            if not chunk:
                break
            yield chunk
    finally:
        if proc.returncode is None:
            proc.kill()
        await proc.wait()
        await release()
