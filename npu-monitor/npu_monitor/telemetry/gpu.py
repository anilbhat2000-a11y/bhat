"""GPU telemetry from whichever source the machine offers.

Sources, all optional and combined:
  * NVIDIA      - NVML (``nvidia-ml-py``)
  * AMD (Linux) - ``/sys/class/drm/card*/device/gpu_busy_percent``
  * Intel (Linux, i915/xe) - derived from RC6 / idle residency counters
  * Windows     - ``GPU Engine`` performance counters (any vendor)
"""
from __future__ import annotations

import glob
import os
import time

from .windows_counters import WindowsEngineCounters


class _Residency:
    """busy% = 1 - delta(idle_ms) / delta(wall_ms) for Intel residency counters."""

    def __init__(self, path: str, name: str) -> None:
        self.path, self.name = path, name
        self._last: tuple[float, int] | None = None

    def util(self) -> float | None:
        try:
            idle = int(open(self.path).read())
        except (OSError, ValueError):
            return None
        now = time.monotonic() * 1000
        last, self._last = self._last, (now, idle)
        if last is None or now <= last[0]:
            return None
        busy = 1 - (idle - last[1]) / (now - last[0])
        return round(min(100.0, max(0.0, busy * 100)), 1)


class GpuProbe:
    def __init__(self, win: WindowsEngineCounters) -> None:
        self.win = win
        self.sources: list[str] = []
        self._nvml = None
        try:
            import pynvml  # type: ignore

            pynvml.nvmlInit()
            self._nvml = pynvml
            self._nv_handles = [
                pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(pynvml.nvmlDeviceGetCount())
            ]
            self.sources.append("nvml")
        except Exception:
            self._nv_handles = []

        self._amd = sorted(glob.glob("/sys/class/drm/card[0-9]*/device/gpu_busy_percent"))
        if self._amd:
            self.sources.append("amdgpu-sysfs")

        self._intel: list[_Residency] = []
        for p in sorted(glob.glob("/sys/class/drm/card[0-9]*/gt/gt0/rc6_residency_ms")):
            self._intel.append(_Residency(p, "Intel GPU (i915)"))
        for p in sorted(glob.glob("/sys/class/drm/card[0-9]*/device/tile0/gt0/gtidle/idle_residency_ms")):
            self._intel.append(_Residency(p, "Intel GPU (xe)"))
        if self._intel:
            self.sources.append("intel-residency")
        if win.available:
            self.sources.append("windows-pdh")

    def sample(self) -> list[dict]:
        gpus: list[dict] = []
        for i, h in enumerate(self._nv_handles):
            nv = self._nvml
            try:
                u = nv.nvmlDeviceGetUtilizationRates(h)
                m = nv.nvmlDeviceGetMemoryInfo(h)
                name = nv.nvmlDeviceGetName(h)
                name = name.decode() if isinstance(name, bytes) else name
                power = None
                try:
                    power = round(nv.nvmlDeviceGetPowerUsage(h) / 1000, 1)
                except Exception:
                    pass
                gpus.append({
                    "id": f"nvidia{i}", "name": name, "util": float(u.gpu),
                    "mem_used_gb": round(m.used / 1e9, 2), "mem_total_gb": round(m.total / 1e9, 2),
                    "power_w": power, "source": "nvml",
                })
            except Exception:
                continue
        for p in self._amd:
            try:
                card = p.split(os.sep)[4]
                gpus.append({"id": card, "name": f"AMD GPU ({card})",
                             "util": float(open(p).read().strip()), "source": "amdgpu-sysfs"})
            except (OSError, ValueError, IndexError):
                continue
        for i, r in enumerate(self._intel):
            u = r.util()
            if u is not None:
                gpus.append({"id": f"intel{i}", "name": r.name, "util": u, "source": "intel-residency"})
        if not gpus and self.win.available:
            # On Windows the PDH view covers every vendor; use it only if no
            # vendor API answered, so a GPU is not counted twice.
            for luid, a in self.win.adapters("gpu").items():
                gpus.append({"id": luid, "name": f"GPU {luid}", "util": a["util"], "source": "windows-pdh"})
        return gpus
