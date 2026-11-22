"""Windows Performance Counter (PDH) reader for GPU *and* NPU engines.

On Windows 11 every WDDM/MCDM accelerator - integrated GPU, discrete GPU and the
NPU in Intel Core Ultra, AMD Ryzen AI and Snapdragon X laptops - publishes its
per-engine load under the ``GPU Engine`` counter set. That is exactly what Task
Manager reads for its "NPU" and "GPU" graphs.

Instance names look like::

    pid_4242_luid_0x00000000_0x0000D1A2_phys_0_eng_0_engtype_Compute

Adapters are told apart by the engine types they expose: GPUs expose a ``3D``
engine (and video engines); NPUs expose only compute-type engines. Set the
``NPU_MONITOR_NPU_LUID`` environment variable (e.g. ``0x0000D1A2``) to pin the
NPU adapter if auto-detection guesses wrong.
"""
from __future__ import annotations

import os
import re
import sys
from collections import defaultdict

_INSTANCE = re.compile(
    r"pid_(?P<pid>\d+)_luid_(?P<hi>0x[0-9A-Fa-f]+)_(?P<lo>0x[0-9A-Fa-f]+)"
    r"_phys_(?P<phys>\d+)_eng_(?P<eng>\d+)_engtype_(?P<type>.*)$"
)
_GPU_ENGINE_TYPES = {"3d", "videodecode", "videoencode", "videoprocessing", "graphics_1"}


def parse_engine_values(values: dict[str, float]) -> dict[str, dict]:
    """Fold raw ``GPU Engine`` instance values into per-adapter utilisation.

    Returns ``{luid: {"util": pct, "engine_types": set, "kind": "gpu"|"npu"}}``.
    Pure function - unit tested without Windows.
    """
    engines: dict[str, dict[tuple[str, str, str], float]] = defaultdict(lambda: defaultdict(float))
    types: dict[str, set[str]] = defaultdict(set)
    for name, value in values.items():
        m = _INSTANCE.search(name)
        if not m:
            continue
        luid = m["lo"].lower()
        etype = m["type"].strip()
        engines[luid][(m["phys"], m["eng"], etype)] += max(0.0, float(value))
        types[luid].add(etype)

    pinned = os.environ.get("NPU_MONITOR_NPU_LUID", "").strip().lower()
    out: dict[str, dict] = {}
    for luid, per_engine in engines.items():
        lowered = {t.lower() for t in types[luid]}
        if pinned:
            kind = "npu" if luid == pinned else "gpu"
        else:
            kind = "gpu" if lowered & _GPU_ENGINE_TYPES else "npu"
        out[luid] = {
            # Task Manager convention: an adapter is as busy as its busiest engine.
            "util": round(min(100.0, max(per_engine.values(), default=0.0)), 1),
            "engine_types": sorted(types[luid]),
            "kind": kind,
        }
    return out


class WindowsEngineCounters:
    """Thin wrapper around ``win32pdh``. ``available`` is False off Windows."""

    COUNTER = r"\GPU Engine(*)\Utilization Percentage"

    def __init__(self) -> None:
        self.available = False
        self.error: str | None = None
        self._latest: dict[str, dict] = {}
        if sys.platform != "win32":
            return
        try:
            import win32pdh  # type: ignore

            self._pdh = win32pdh
            self._query = win32pdh.OpenQuery()
            self._counter = win32pdh.AddEnglishCounter(self._query, self.COUNTER)
            win32pdh.CollectQueryData(self._query)  # rate counters need 2 samples
            self.available = True
        except Exception as exc:  # pywin32 missing or counter set absent
            self.error = f"PDH unavailable: {exc}"

    def refresh(self) -> dict[str, dict]:
        """Collect once per sampler tick; GPU and NPU probes share the result."""
        if not self.available:
            return {}
        try:
            self._pdh.CollectQueryData(self._query)
            raw = self._pdh.GetFormattedCounterArray(self._counter, self._pdh.PDH_FMT_DOUBLE)
            self._latest = parse_engine_values(raw)
        except Exception as exc:
            # Instances vanish when processes exit; a transient failure is normal.
            self.error = str(exc)
        return self._latest

    def adapters(self, kind: str) -> dict[str, dict]:
        return {k: v for k, v in self._latest.items() if v["kind"] == kind}
