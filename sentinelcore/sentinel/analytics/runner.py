"""Analytics worker: reads a camera stream at a fixed sample rate with FFmpeg,
runs the detector + rule pipeline, and posts events to the central server's
edge ingest API. Run the same worker on an edge box (Jetson/NUC) or on the
central GPU server — that is the hybrid architecture.

    python -m sentinel.analytics.runner --server https://sentinel.local \
        --api-key <edge key> --camera-id 12 --url rtsp://... --model yolov8n.onnx --fps 5 \
        --rules rules.json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import time
from collections.abc import Iterator

import httpx

from .engine import CameraPipeline, EventOut


def ffmpeg_frames(url: str, size: int, fps: float) -> Iterator[bytes]:
    cmd = ["ffmpeg", "-v", "error"]
    if url.startswith("rtsp://"):
        cmd += ["-rtsp_transport", "tcp"]
    cmd += ["-i", url, "-vf", f"fps={fps},scale={size}:{size}", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    frame_bytes = size * size * 3
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    try:
        assert proc.stdout is not None
        while True:
            buf = proc.stdout.read(frame_bytes)
            if len(buf) < frame_bytes:
                return
            yield buf
    finally:
        proc.kill()


def to_payload(camera_id: int, ev: EventOut) -> dict:
    return {"camera_id": camera_id, "type": ev.type, "object_class": ev.object_class,
            "confidence": round(ev.confidence, 3), "zone": ev.zone, "ts": ev.ts,
            "details": {**ev.details, "track_id": ev.track_id}}


def run(server: str, api_key: str, camera_id: int, frames: Iterator[bytes], detector, size: int,
        rules: list[dict], clock=time.time, post=None) -> int:
    pipe = CameraPipeline(rules)
    client = httpx.Client(base_url=server, headers={"X-Edge-Key": api_key}, timeout=10)
    post = post or (lambda body: client.post("/api/edge/events", json=body).raise_for_status())
    sent = 0
    for frame in frames:
        ts = clock()
        for ev in pipe.step(detector.detect(frame, size, size), ts):
            try:
                post(to_payload(camera_id, ev))
                sent += 1
            except httpx.HTTPError as e:  # keep running; server may be restarting
                print(f"post failed: {e}")
    return sent


def main() -> None:  # pragma: no cover - CLI glue
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", required=True)
    ap.add_argument("--api-key", required=True)
    ap.add_argument("--camera-id", type=int, required=True)
    ap.add_argument("--url", required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--rules", required=True, help="JSON file with a list of analytic configs")
    ap.add_argument("--fps", type=float, default=5)
    ap.add_argument("--size", type=int, default=640)
    a = ap.parse_args()
    from .detectors import OnnxYoloDetector
    det = OnnxYoloDetector(a.model, input_size=a.size)
    with open(a.rules) as f:
        rules = json.load(f)
    run(a.server, a.api_key, a.camera_id, ffmpeg_frames(a.url, a.size, a.fps), det, a.size, rules)


if __name__ == "__main__":  # pragma: no cover
    main()
