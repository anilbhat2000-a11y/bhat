"""NPU telemetry.

Order of preference (the dashboard always shows which one is live):

1. ``hardware`` - Linux ``intel_vpu`` driver: ``/sys/class/accel/accelN/device/npu_busy_time_us``
   (Intel Core Ultra / Meteor Lake, Lunar Lake, Arrow Lake, Panther Lake).
2. ``hardware`` - Windows ``GPU Engine`` counters of the NPU adapter
   (Intel, AMD Ryzen AI, Qualcomm Snapdragon X - same source as Task Manager).
3. ``estimated`` - the fraction of wall-clock time this application kept the NPU
   busy with inference requests. Accurate for this app's own load, blind to
   other processes. Used when no hardware counter is readable (e.g. AMD XDNA
   on Linux, which has no public busy counter yet).
"""
from __future__ import annotations

import glob
import os
import threading
import time
from collections import deque

from .windows_counters import WindowsEngineCounters


class BusyTracker:
    """Records how long each device kind spent executing inference requests."""

    def __init__(self, horizon_s: float = 30.0) -> None:
        self._lock = threading.Lock()
        self._spans: dict[str, deque[tuple[float, float]]] = {}
        self._horizon = horizon_s

    def record(self, kind: str, start: float, end: float) -> None:
        with self._lock:
            q = self._spans.setdefault(kind, deque())
            q.append((start, end))
            cutoff = end - self._horizon
            while q and q[0][1] < cutoff:
                q.popleft()

    def utilisation(self, kind: str, window_s: float, now: float | None = None) -> float:
        """Percentage of the last ``window_s`` seconds covered by busy spans."""
        now = time.monotonic() if now is None else now
        lo = now - window_s
        with self._lock:
            spans = list(self._spans.get(kind, ()))
        busy, cursor = 0.0, lo
        for s, e in sorted(spans):  # merge overlaps from concurrent requests
            s, e = max(s, cursor), min(e, now)
            if e > s:
                busy += e - s
                cursor = e
        return round(min(100.0, busy / window_s * 100), 1)


BUSY = BusyTracker()


class NpuProbe:
    def __init__(self, win: WindowsEngineCounters, window_s: float = 1.0) -> None:
        self.win = win
        self.window_s = window_s
        self.devices: list[dict] = []
        self._intel: list[tuple[str, str]] = []  # (accel name, busy file)
        self._last: dict[str, tuple[float, int]] = {}

        for dev in sorted(glob.glob("/sys/class/accel/accel*")):
            name = os.path.basename(dev)
            driver = ""
            try:
                driver = os.path.basename(os.readlink(os.path.join(dev, "device", "driver")))
            except OSError:
                pass
            busy = os.path.join(dev, "device", "npu_busy_time_us")
            if os.path.exists(busy):
                self._intel.append((name, busy))
                self.devices.append({"id": name, "driver": driver or "intel_vpu", "source": "hardware"})
            else:
                self.devices.append({"id": name, "driver": driver or "unknown", "source": "estimated"})
        if win.available:
            self.devices.append({"id": "windows-npu", "driver": "wddm/mcdm", "source": "hardware"})

    @property
    def source(self) -> str:
        if self._intel:
            return "hardware:intel_vpu-sysfs"
        if self.win.available and self.win.adapters("npu"):
            return "hardware:windows-pdh"
        return "estimated:in-app"

    def _intel_util(self, name: str, path: str) -> float | None:
        try:
            us = int(open(path).read())
        except (OSError, ValueError):
            return None
        now = time.monotonic()
        last, self._last[name] = self._last.get(name), (now, us)
        if last is None or now <= last[0] or us < last[1]:
            return None
        return round(min(100.0, (us - last[1]) / 1e6 / (now - last[0]) * 100), 1)

    @staticmethod
    def _intel_mem(path: str) -> float | None:
        mem = os.path.join(os.path.dirname(path), "npu_memory_utilization")
        try:
            return round(int(open(mem).read()) / 1e6, 1)  # bytes -> MB
        except (OSError, ValueError):
            return None

    def sample(self) -> dict:
        app = BUSY.utilisation("npu", self.window_s)
        util, source, mem_mb = None, "estimated:in-app", None
        for name, path in self._intel:
            u = self._intel_util(name, path)
            if u is not None:
                util = max(util or 0.0, u)
                source = "hardware:intel_vpu-sysfs"
                mem_mb = self._intel_mem(path)
        if util is None and self.win.available:
            npus = self.win.adapters("npu")
            if npus:
                util = max(a["util"] for a in npus.values())
                source = "hardware:windows-pdh"
        if util is None:
            util = app
        return {
            "util": util,
            "app_util": app,  # share of NPU time used by this app
            "source": source,
            "mem_mb": mem_mb,
            "detected": bool(self.devices),
        }
