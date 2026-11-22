"""Battery telemetry: charge, power draw, health (wear), cycles, temperature.

* Linux:   /sys/class/power_supply/BAT*  (energy_* in µWh or charge_* in µAh)
* Windows: WMI root\\wmi  BatteryStaticData / BatteryFullChargedCapacity /
           BatteryStatus / BatteryCycleCount  (via pywin32)
* All:     psutil.sensors_battery() for percent / plugged / time left

Health = full-charge capacity ÷ design capacity. Li-ion packs are commonly
considered worn out at 80 %.
"""
from __future__ import annotations

import glob
import os
import sys
import time

import psutil


def _read(path: str) -> str | None:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return None


def _num(path: str) -> float | None:
    v = _read(path)
    try:
        return float(v) if v is not None else None
    except ValueError:
        return None


class BatteryProbe:
    STATIC_TTL = 60.0  # design/full capacity and cycles change slowly

    def __init__(self) -> None:
        self._linux = sorted(glob.glob(os.environ.get("NPU_MONITOR_BATTERY_GLOB", "/sys/class/power_supply/BAT*")))
        self._wmi = None
        if sys.platform == "win32":
            try:
                import win32com.client  # type: ignore

                self._wmi = win32com.client.GetObject("winmgmts:root\\wmi")
            except Exception:
                self._wmi = None
        self._static: dict = {}
        self._static_t = 0.0
        self._dyn: dict = {}
        self._dyn_t = 0.0

    # ---------------------------------------------------------------------------
    def _linux_sample(self) -> dict:
        bat = self._linux[0]
        f = lambda n: _num(os.path.join(bat, n))
        volt = f("voltage_now") or f("voltage_min_design")
        out: dict = {"status": _read(os.path.join(bat, "status")), "cycles": f("cycle_count") or None,
                     "manufacturer": _read(os.path.join(bat, "manufacturer")),
                     "model": _read(os.path.join(bat, "model_name")),
                     "technology": _read(os.path.join(bat, "technology"))}
        if f("energy_full") is not None:            # µWh
            out["design_wh"] = (f("energy_full_design") or 0) / 1e6 or None
            out["full_wh"] = f("energy_full") / 1e6
            out["now_wh"] = (f("energy_now") or 0) / 1e6
        elif f("charge_full") is not None and volt:  # µAh × V
            v = volt / 1e6
            out["design_wh"] = (f("charge_full_design") or 0) / 1e6 * v or None
            out["full_wh"] = f("charge_full") / 1e6 * v
            out["now_wh"] = (f("charge_now") or 0) / 1e6 * v
        if f("power_now") is not None:
            out["power_w"] = f("power_now") / 1e6
        elif f("current_now") is not None and volt:
            out["power_w"] = f("current_now") * volt / 1e12
        out["voltage_v"] = volt / 1e6 if volt else None
        return out

    def _wmi_query(self, cls: str, fields: str):
        try:
            return list(self._wmi.ExecQuery(f"SELECT {fields} FROM {cls}"))
        except Exception:
            return []

    def _windows_static(self) -> dict:
        out: dict = {}
        for b in self._wmi_query("BatteryStaticData", "DesignedCapacity, ManufactureName, DeviceName"):
            out["design_wh"] = (b.DesignedCapacity or 0) / 1000 or None   # mWh
            out["manufacturer"], out["model"] = b.ManufactureName, b.DeviceName
        for b in self._wmi_query("BatteryFullChargedCapacity", "FullChargedCapacity"):
            out["full_wh"] = (b.FullChargedCapacity or 0) / 1000 or None
        for b in self._wmi_query("BatteryCycleCount", "CycleCount"):
            out["cycles"] = b.CycleCount or None
        return out

    def _windows_dynamic(self) -> dict:
        out: dict = {}
        for b in self._wmi_query("BatteryStatus", "RemainingCapacity, DischargeRate, ChargeRate, Voltage, PowerOnline, Charging"):
            out["now_wh"] = (b.RemainingCapacity or 0) / 1000
            out["voltage_v"] = (b.Voltage or 0) / 1000 or None
            if b.DischargeRate:
                out["power_w"] = b.DischargeRate / 1000
            elif b.ChargeRate:
                out["power_w"] = -b.ChargeRate / 1000
            out["status"] = "Charging" if b.Charging else ("Full" if b.PowerOnline else "Discharging")
        return out

    # ---------------------------------------------------------------------------
    def sample(self) -> dict:
        try:
            ps = psutil.sensors_battery()
        except Exception:
            ps = None
        if ps is None and not self._linux and self._wmi is None:
            return {"present": False}
        now = time.monotonic()
        info: dict = {}
        if self._linux:
            info = self._linux_sample()
        elif self._wmi is not None:
            if now - self._static_t > self.STATIC_TTL:
                self._static, self._static_t = self._windows_static(), now
            if now - self._dyn_t > 2.0:  # WMI is slow-ish; battery gauges update ~1 Hz anyway
                self._dyn, self._dyn_t = self._windows_dynamic(), now
            info = {**self._static, **self._dyn}
        if ps is None and not info.get("full_wh"):
            return {"present": False}

        percent = ps.percent if ps else (info["now_wh"] / info["full_wh"] * 100 if info.get("full_wh") else None)
        plugged = ps.power_plugged if ps else info.get("status") in ("Charging", "Full")
        secs = ps.secsleft if ps and ps.secsleft not in (psutil.POWER_TIME_UNLIMITED, psutil.POWER_TIME_UNKNOWN) else None
        design, full = info.get("design_wh"), info.get("full_wh")
        health = round(min(100.0, full / design * 100), 1) if design and full else None
        power = info.get("power_w")
        if power is not None and plugged and info.get("status") == "Charging":
            power = -abs(power)  # negative = charging
        return {
            "present": True,
            "percent": round(percent, 1) if percent is not None else None,
            "plugged": bool(plugged),
            "status": info.get("status") or ("Charging" if plugged else "Discharging"),
            "power_w": round(power, 2) if power is not None else None,
            "now_wh": round(info["now_wh"], 2) if info.get("now_wh") else None,
            "full_wh": round(full, 2) if full else None,
            "design_wh": round(design, 2) if design else None,
            "health_pct": health,
            "cycles": int(info["cycles"]) if info.get("cycles") else None,
            "voltage_v": round(info["voltage_v"], 2) if info.get("voltage_v") else None,
            "os_secs_left": secs,
            "manufacturer": info.get("manufacturer"),
            "model": info.get("model"),
        }


def temperatures() -> dict:
    """CPU / battery temperatures where the OS exposes them (Linux mostly)."""
    try:
        temps = psutil.sensors_temperatures()
    except Exception:
        return {}
    out = {}
    for name, entries in (temps or {}).items():
        vals = [e.current for e in entries if e.current]
        if vals:
            out[name] = round(max(vals), 1)
    return out
