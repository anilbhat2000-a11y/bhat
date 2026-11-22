"""Background sampler: polls CPU / GPU / NPU at a fixed rate and keeps history.

Also derives the *impact* of NPU work on CPU and GPU by comparing samples taken
while the NPU was busy against samples taken while the machine was idle.
"""
from __future__ import annotations

import math
import threading
import time
from collections import deque
from statistics import fmean

from .battery import BatteryProbe, temperatures
from .cpu import CpuProbe
from .gpu import GpuProbe
from .npu import BUSY, NpuProbe
from .windows_counters import WindowsEngineCounters


class InferenceStats:
    """Thread-safe log of inference events, for FPS / latency per device kind."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._events: deque[tuple[float, str, float, str]] = deque(maxlen=20000)
        self.active: dict[str, str] = {}  # workload name -> device id

    def record(self, kind: str, latency_ms: float, workload: str) -> None:
        with self._lock:
            self._events.append((time.monotonic(), kind, latency_ms, workload))

    def window(self, seconds: float) -> dict:
        cutoff = time.monotonic() - seconds
        with self._lock:
            recent = [e for e in self._events if e[0] >= cutoff]
        by_kind: dict[str, list[float]] = {}
        for _, kind, lat, _ in recent:
            by_kind.setdefault(kind, []).append(lat)
        return {
            k: {"ips": round(len(v) / seconds, 1), "latency_ms": round(fmean(v), 2)}
            for k, v in by_kind.items()
        }


INFERENCE = InferenceStats()


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 5:
        return None
    mx, my = fmean(xs), fmean(ys)
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if sx < 1e-9 or sy < 1e-9:
        return None
    return round(sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy), 2)


def gpu_util(sample: dict) -> float:
    return max((g["util"] for g in sample["gpu"]), default=0.0)


def classify(sample: dict, threshold: float = 5.0) -> str:
    """Label a sample 'npu_active', 'idle' or 'other' (CPU/GPU inference only)."""
    inf = sample["inference"]
    if sample["npu"]["util"] >= threshold or "npu" in inf:
        return "npu_active"
    if not inf and sample["npu"]["util"] < 2.0:
        return "idle"
    return "other"


def impact(samples: list[dict]) -> dict:
    """Compare CPU / GPU / power while the NPU works vs while it is idle."""
    groups: dict[str, list[dict]] = {"idle": [], "npu_active": [], "other": []}
    for s in samples:
        groups[classify(s)].append(s)

    def stats(group: list[dict]) -> dict | None:
        if not group:
            return None
        powers = [s["cpu"]["power_w"] for s in group if s["cpu"]["power_w"] is not None]
        return {
            "samples": len(group),
            "npu": round(fmean(s["npu"]["util"] for s in group), 1),
            "cpu": round(fmean(s["cpu"]["util"] for s in group), 1),
            "app_cpu": round(fmean(s["cpu"]["app_util"] for s in group), 1),
            "gpu": round(fmean(gpu_util(s) for s in group), 1),
            "mem_pct": round(fmean(s["cpu"]["mem_used_pct"] for s in group), 1),
            "power_w": round(fmean(powers), 1) if powers else None,
        }

    idle, active = stats(groups["idle"]), stats(groups["npu_active"])
    delta = None
    if idle and active:
        delta = {
            k: (round(active[k] - idle[k], 1) if active[k] is not None and idle[k] is not None else None)
            for k in ("npu", "cpu", "app_cpu", "gpu", "mem_pct", "power_w")
        }
    npu = [s["npu"]["util"] for s in samples]
    return {
        "idle": idle,
        "npu_active": active,
        "other": stats(groups["other"]),
        "delta": delta,
        "correlation": {
            "npu_cpu": _pearson(npu, [s["cpu"]["util"] for s in samples]),
            "npu_gpu": _pearson(npu, [gpu_util(s) for s in samples]),
        },
    }


class Sampler:
    def __init__(self, interval_s: float = 0.5, history_s: float = 900) -> None:
        self.interval = interval_s
        self.win = WindowsEngineCounters()
        self.cpu = CpuProbe()
        self.gpu = GpuProbe(self.win)
        self.battery = BatteryProbe()
        self.npu = NpuProbe(self.win, window_s=max(1.0, interval_s * 2))
        self.history: deque[dict] = deque(maxlen=int(history_s / interval_s))
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._listeners: list = []

    def start(self) -> None:
        if self._thread is None:
            self._thread = threading.Thread(target=self._run, name="sampler", daemon=True)
            self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def subscribe(self, fn) -> None:
        self._listeners.append(fn)

    def unsubscribe(self, fn) -> None:
        if fn in self._listeners:
            self._listeners.remove(fn)

    def sample_once(self) -> dict:
        self.win.refresh()
        cpu = self.cpu.sample()
        bat = self.battery.sample()
        if cpu["power_w"] is None and bat.get("present") and not bat.get("plugged") and (bat.get("power_w") or 0) > 0:
            cpu["power_w"], cpu["power_source"] = bat["power_w"], "battery discharge (whole system)"
        s = {
            "ts": time.time(),
            "cpu": cpu,
            "battery": bat,
            "temps": temperatures(),
            "gpu": self.gpu.sample(),
            "npu": self.npu.sample(),
            "inference": INFERENCE.window(max(1.0, self.interval * 2)),
            "app_busy": {k: BUSY.utilisation(k, max(1.0, self.interval * 2)) for k in ("cpu", "gpu")},
            "workloads": dict(INFERENCE.active),
        }
        s["phase"] = classify(s)
        return s

    def _run(self) -> None:
        while not self._stop.is_set():
            t0 = time.monotonic()
            try:
                s = self.sample_once()
                with self._lock:
                    self.history.append(s)
                for fn in list(self._listeners):
                    try:
                        fn(s)
                    except Exception:
                        pass
            except Exception as exc:  # never let the sampler die
                print(f"[sampler] {exc}")
            self._stop.wait(max(0.0, self.interval - (time.monotonic() - t0)))

    def latest(self) -> dict | None:
        with self._lock:
            return self.history[-1] if self.history else None

    def since(self, seconds: float) -> list[dict]:
        cutoff = time.time() - seconds
        with self._lock:
            return [s for s in self.history if s["ts"] >= cutoff]

    def between(self, t0: float, t1: float) -> list[dict]:
        with self._lock:
            return [s for s in self.history if t0 <= s["ts"] <= t1]

    def describe(self) -> dict:
        return {
            "interval_s": self.interval,
            "npu_source": self.npu.source,
            "npu_devices": self.npu.devices,
            "gpu_sources": self.gpu.sources,
            "windows_pdh": self.win.available,
        }
