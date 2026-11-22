"""CPU, memory and package-power telemetry."""
from __future__ import annotations

import glob
import os
import time

import psutil


class CpuProbe:
    """Samples whole-system CPU load, this process's CPU, memory and power."""

    def __init__(self) -> None:
        self._proc = psutil.Process(os.getpid())
        # Prime the counters: the first cpu_percent() call always returns 0.
        psutil.cpu_percent(percpu=True)
        self._proc.cpu_percent()
        self._rapl = _RaplReader()

    def sample(self) -> dict:
        per_core = psutil.cpu_percent(percpu=True)
        total = sum(per_core) / len(per_core) if per_core else 0.0
        mem = psutil.virtual_memory()
        freq = None
        try:
            f = psutil.cpu_freq()
            freq = round(f.current) if f else None
        except Exception:  # not available on some VMs / ARM
            pass
        cores = psutil.cpu_count() or 1
        return {
            "util": round(total, 1),
            "per_core": [round(c, 1) for c in per_core],
            "freq_mhz": freq,
            "app_util": round(self._proc.cpu_percent() / cores, 1),
            "mem_used_pct": round(mem.percent, 1),
            "mem_used_gb": round(mem.used / 1e9, 2),
            "mem_total_gb": round(mem.total / 1e9, 2),
            "power_w": self._rapl.watts(),
        }


class _RaplReader:
    """Linux Intel/AMD RAPL package energy -> watts. Silently absent elsewhere."""

    def __init__(self) -> None:
        self._paths = [
            p for p in glob.glob("/sys/class/powercap/intel-rapl:*/energy_uj")
            if p.count(":") == 1  # package domains only, not sub-zones
        ]
        self._last: tuple[float, int] | None = None

    def _read(self) -> int | None:
        try:
            return sum(int(open(p).read()) for p in self._paths)
        except (OSError, ValueError):
            self._paths = []
            return None

    def watts(self) -> float | None:
        if not self._paths:
            return None
        now, e = time.monotonic(), self._read()
        if e is None:
            return None
        last, self._last = self._last, (now, e)
        if last is None or e < last[1] or now <= last[0]:
            return None
        return round((e - last[1]) / 1e6 / (now - last[0]), 1)
