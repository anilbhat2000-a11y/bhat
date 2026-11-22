"""Identify the machine: CPU / SoC brand, NPU name, and vendor-rated NPU TOPS."""
from __future__ import annotations

import os
import platform
import re
import subprocess
import sys

import psutil

# Vendor-published peak NPU performance (INT8 TOPS) by SoC family. Patterns are
# matched against the CPU brand string. Values are the NPU alone, not
# "platform TOPS" (CPU+GPU+NPU). Microsoft's Copilot+ PC bar is 40 NPU TOPS.
_TOPS_TABLE: list[tuple[str, str, int]] = [
    (r"Core\(TM\) Ultra [3579] 3\d\d", "Intel Core Ultra series 3 (Panther Lake)", 50),
    (r"Core\(TM\) Ultra [3579] 2\d\dV", "Intel Core Ultra 200V (Lunar Lake)", 48),
    (r"Core\(TM\) Ultra [3579] 2\d\d[HUSKF]", "Intel Core Ultra 200H/U/S (Arrow Lake)", 13),
    (r"Core\(TM\) Ultra [3579] 1\d\d[HU]", "Intel Core Ultra series 1 (Meteor Lake)", 11),
    (r"Ryzen AI Max", "AMD Ryzen AI Max (Strix Halo)", 50),
    (r"Ryzen AI [3579] (HX )?(PRO )?3\d\d", "AMD Ryzen AI 300 (Strix / Krackan Point)", 50),
    (r"Ryzen [3579] (PRO )?8\d40(U|HS|H)\b", "AMD Ryzen 8040 (Hawk Point)", 16),
    (r"Ryzen [3579] (PRO )?8[67]00G", "AMD Ryzen 8000G (Phoenix desktop)", 16),
    (r"Ryzen [3579] (PRO )?7\d40(U|HS|H)\b", "AMD Ryzen 7040 (Phoenix)", 10),
    (r"Snapdragon\(?R?\)? X", "Qualcomm Snapdragon X (Hexagon NPU)", 45),
]
COPILOT_PLUS_TOPS = 40


def cpu_name() -> str:
    try:
        if sys.platform == "win32":
            import winreg

            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0") as k:
                return winreg.QueryValueEx(k, "ProcessorNameString")[0].strip()
        if sys.platform == "darwin":
            return subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip()
        with open("/proc/cpuinfo", encoding="utf-8") as f:
            for line in f:
                if line.lower().startswith(("model name", "hardware")):
                    return line.split(":", 1)[1].strip()
    except Exception:
        pass
    return platform.processor() or platform.machine()


def rated_npu(cpu: str) -> dict:
    for pattern, family, tops in _TOPS_TABLE:
        if re.search(pattern, cpu, re.IGNORECASE):
            return {"family": family, "tops": tops, "copilot_plus": tops >= COPILOT_PLUS_TOPS}
    return {"family": None, "tops": None, "copilot_plus": False}


def npu_names() -> list[str]:
    names = []
    try:
        import openvino as ov

        core = ov.Core()
        for d in core.available_devices:
            if d.startswith("NPU"):
                n = core.get_property(d, "FULL_DEVICE_NAME")
                try:
                    n += f" (driver {core.get_property(d, 'NPU_DRIVER_VERSION')})"
                except Exception:
                    pass
                names.append(n)
    except Exception:
        pass
    return names


def npu_hardware() -> list[str]:
    """NPU hardware seen by the OS, independent of any AI runtime being installed."""
    found = []
    try:
        import glob

        for dev in sorted(glob.glob("/sys/class/accel/accel*")):
            try:
                drv = os.path.basename(os.readlink(os.path.join(dev, "device", "driver")))
            except OSError:
                drv = "accel"
            found.append(f"{os.path.basename(dev)} ({drv})")
    except Exception:
        pass
    if sys.platform == "win32":
        try:
            import win32com.client  # type: ignore

            wmi = win32com.client.GetObject("winmgmts:root\\cimv2")
            for d in wmi.ExecQuery("SELECT Name, PNPClass FROM Win32_PnPEntity"):
                name = d.Name or ""
                if d.PNPClass == "ComputeAccelerator" or re.search(r"\bNPU\b|AI Boost|Hexagon|AMD IPU", name):
                    found.append(name)
        except Exception:
            pass
    return sorted(set(found))


def ai_pc_class(hw: dict) -> dict:
    """'Copilot+ AI PC' (NPU >= 40 TOPS), 'AI PC' (has an NPU) or 'Not an AI PC'."""
    rated = hw.get("rated_npu") or {}
    has_npu = bool(hw.get("npu_names") or hw.get("npu_hardware") or rated.get("tops"))
    if has_npu and (rated.get("tops") or 0) >= COPILOT_PLUS_TOPS:
        cls, why = "Copilot+ AI PC", f"NPU rated {rated['tops']} TOPS (at least {COPILOT_PLUS_TOPS} TOPS)"
    elif has_npu:
        cls = "AI PC"
        why = (f"NPU rated {rated['tops']} TOPS, below the {COPILOT_PLUS_TOPS} TOPS Copilot+ bar" if rated.get("tops")
               else "NPU detected, TOPS rating unknown")
    else:
        cls, why = "Not an AI PC", "no NPU (neural processing unit) detected; AI runs on the CPU/GPU only"
    return {"class": cls, "is_ai_pc": has_npu, "reason": why}


def machine_type() -> str:
    """Rough class: laptop (has a battery), desktop, or server (many cores, no battery)."""
    try:
        has_battery = psutil.sensors_battery() is not None
    except Exception:
        has_battery = False
    if has_battery:
        return "laptop"
    chassis = ""
    try:
        chassis = open("/sys/class/dmi/id/chassis_type").read().strip()
    except OSError:
        pass
    if chassis in ("17", "23", "28") or (psutil.cpu_count(logical=False) or 0) >= 24:
        return "server"
    return "desktop"


def collect() -> dict:
    cpu = cpu_name()
    info = {
        "host": platform.node(),
        "os": f"{platform.system()} {platform.release()}",
        "machine_type": machine_type(),
        "cpu": cpu,
        "cores_physical": psutil.cpu_count(logical=False),
        "cores_logical": psutil.cpu_count(),
        "ram_gb": round(psutil.virtual_memory().total / 1e9, 1),
        "npu_names": npu_names(),
        "npu_hardware": npu_hardware(),
        "rated_npu": rated_npu(cpu),
    }
    info["ai_pc"] = ai_pc_class(info)
    from .identity import collect as identity

    info["identity"] = identity()
    chassis = info["identity"].get("chassis") or ""
    if "laptop" in chassis or chassis in ("tablet", "handheld"):
        info["machine_type"] = "laptop"
    elif chassis == "server":
        info["machine_type"] = "server"
    elif chassis and info["machine_type"] != "laptop":
        info["machine_type"] = "workstation" if (psutil.cpu_count() or 0) >= 16 else "desktop"
    return info
