"""Live sources: the laptop camera (OpenCV) and screen/graphics capture (mss).

Each source runs a capture -> NPU inference -> annotate loop on its own thread
and keeps the newest annotated JPEG for the MJPEG stream the dashboard shows.
"""
from __future__ import annotations

import sys
import threading
import time

import numpy as np
from PIL import Image

from ..inference.engine import EngineManager
from ..telemetry.sampler import INFERENCE


class LiveSource:
    def __init__(self, engines: EngineManager) -> None:
        self.engines = engines
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._frame_lock = threading.Lock()
        self._jpeg: bytes | None = None
        self._frame_id = 0
        self.status: dict = {"running": False}

    # --- lifecycle -----------------------------------------------------------
    def start(self, mode: str, device_id: str | None, camera_index: int = 0,
              max_fps: float = 30.0, monitor: int = 1) -> dict:
        self.stop()
        engine = self.engines.get(device_id)  # compile before reporting success
        opener = {"camera": self._open_camera, "screen": self._open_screen}.get(mode)
        if opener is None:
            raise ValueError("mode must be 'camera' or 'screen'")
        grab, close, desc = opener(camera_index if mode == "camera" else monitor)
        self._stop.clear()
        self.status = {"running": True, "mode": mode, "device": engine.device.id,
                       "source": desc, "frames": 0, "fps": 0.0, "last": None, "error": None}
        INFERENCE.active[mode] = engine.device.id
        self._thread = threading.Thread(target=self._loop, args=(mode, engine, grab, close, max_fps),
                                        name=f"live-{mode}", daemon=True)
        self._thread.start()
        return self.status

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3)
        self._thread = None
        self.status = {**self.status, "running": False}
        INFERENCE.active.pop("camera", None)
        INFERENCE.active.pop("screen", None)

    # --- openers return (grab() -> RGB ndarray | None, close(), description) ---
    @staticmethod
    def _open_camera(index: int):
        import cv2

        backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
        cap = cv2.VideoCapture(index, backend)
        if not cap.isOpened():
            raise RuntimeError(f"camera {index} could not be opened (in use, absent or permission denied)")
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        def grab():
            ok, bgr = cap.read()
            return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB) if ok else None

        w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        return grab, cap.release, f"camera {index} ({w}x{h})"

    @staticmethod
    def _open_screen(monitor: int):
        import mss

        sct = mss.mss()
        if monitor >= len(sct.monitors):
            monitor = 1
        mon = sct.monitors[monitor]

        def grab():
            shot = sct.grab(mon)
            return np.asarray(shot)[:, :, 2::-1]  # BGRA -> RGB

        return grab, sct.close, f"screen {monitor} ({mon['width']}x{mon['height']})"

    # --- main loop -----------------------------------------------------------
    def _loop(self, mode, engine, grab, close, max_fps) -> None:
        import cv2

        min_dt = 1.0 / max_fps if max_fps > 0 else 0.0
        t_window, n_window = time.monotonic(), 0
        try:
            while not self._stop.is_set():
                t0 = time.monotonic()
                rgb = grab()
                if rgb is None:
                    self.status["error"] = "no frame from source"
                    time.sleep(0.2)
                    continue
                result = engine.classify(Image.fromarray(rgb), workload=mode, top_k=3)
                frame = self._annotate(cv2, np.ascontiguousarray(rgb), result, self.status.get("fps", 0))
                ok, jpg = cv2.imencode(".jpg", cv2.cvtColor(frame, cv2.COLOR_RGB2BGR),
                                       [cv2.IMWRITE_JPEG_QUALITY, 75])
                if ok:
                    with self._frame_lock:
                        self._jpeg, self._frame_id = jpg.tobytes(), self._frame_id + 1
                n_window += 1
                self.status["frames"] += 1
                self.status["last"] = result
                if time.monotonic() - t_window >= 1.0:
                    self.status["fps"] = round(n_window / (time.monotonic() - t_window), 1)
                    t_window, n_window = time.monotonic(), 0
                dt = time.monotonic() - t0
                if dt < min_dt:
                    self._stop.wait(min_dt - dt)
        except Exception as exc:
            self.status["error"] = str(exc)
        finally:
            close()
            self.status["running"] = False
            INFERENCE.active.pop(mode, None)

    @staticmethod
    def _annotate(cv2, rgb: np.ndarray, result: dict, fps: float) -> np.ndarray:
        h, w = rgb.shape[:2]
        scale = 960 / w if w > 960 else 1.0  # keep the stream light
        if scale != 1.0:
            rgb = cv2.resize(rgb, (int(w * scale), int(h * scale)))
        lines = [f"{result['kind'].upper()}  {result['latency_ms']:.1f} ms  {fps:.1f} FPS"]
        lines += [f"{t['label'][:28]}  {t['score'] * 100:.1f}%" for t in result["top"]]
        box_h = 22 * len(lines) + 12
        overlay = rgb.copy()
        cv2.rectangle(overlay, (8, 8), (360, 8 + box_h), (20, 20, 20), -1)
        rgb = cv2.addWeighted(overlay, 0.65, rgb, 0.35, 0)
        for i, ln in enumerate(lines):
            cv2.putText(rgb, ln, (18, 32 + i * 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                        (255, 255, 255), 1, cv2.LINE_AA)
        return rgb

    def latest_jpeg(self) -> tuple[int, bytes | None]:
        with self._frame_lock:
            return self._frame_id, self._jpeg
