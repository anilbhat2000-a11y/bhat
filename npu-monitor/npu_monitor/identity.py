"""Machine identity: make, model, serial numbers, manufacturing date, firmware, asset tag.

Sources
* Windows: WMI (Win32_ComputerSystem, Win32_ComputerSystemProduct, Win32_BIOS,
  Win32_BaseBoard, Win32_SystemEnclosure, Win32_OperatingSystem, BatteryStaticData)
* Linux:   /sys/class/dmi/id/* (serial numbers need root; reported as such)
* macOS:   system_profiler SPHardwareDataType

Manufacturing date: PCs have no standard field for it. We report the dates the
firmware does record and an *estimate* = the earliest of
  - battery manufacture date (laptops; set at the factory),
  - BIOS/UEFI release date (the machine cannot be older than its first firmware;
    a later BIOS update moves this date forward, so it is an upper bound),
  - operating-system install date,
always with the source named, and an administrator can override it per machine.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import date

JUNK = re.compile(r"^(to be filled.*|default string|system (serial number|product name|manufacturer|version)|"
                  r"not (applicable|specified|available)|none|null|n/?a|0+|o\.e\.m\.?|oem|x+|123456789|"
                  r"chassis serial number|base board serial number|type1productconfigid|sku|invalid)$", re.I)

CHASSIS = {3: "desktop", 4: "desktop", 5: "desktop", 6: "desktop", 7: "desktop", 8: "laptop", 9: "laptop",
           10: "laptop", 11: "handheld", 13: "all-in-one", 14: "laptop", 15: "desktop", 16: "desktop",
           17: "server", 23: "server", 28: "server", 30: "tablet", 31: "laptop (convertible)", 32: "laptop (detachable)",
           35: "mini PC", 36: "stick PC"}


def clean(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip().strip("\x00").strip()
    return None if not s or JUNK.match(s) else s


def _wmi_date(v) -> str | None:
    """'20230115000000.000000+000' -> '2023-01-15'."""
    m = re.match(r"^(\d{4})(\d{2})(\d{2})", str(v or ""))
    if not m:
        return None
    try:
        return date(int(m[1]), int(m[2]), int(m[3])).isoformat()
    except ValueError:
        return None


def _us_date(v) -> str | None:
    """Linux bios_date '01/15/2023' -> '2023-01-15'."""
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", str(v or "").strip())
    if not m:
        return None
    try:
        return date(int(m[3]), int(m[1]), int(m[2])).isoformat()
    except ValueError:
        return None


def estimate_manufacture(dates: dict) -> dict:
    """Pick the earliest plausible date and say where it came from."""
    labels = {"battery_manufacture_date": "battery manufacture date",
              "bios_release_date": "BIOS/UEFI release date",
              "os_install_date": "operating-system install date"}
    cands = [(v, labels[k]) for k, v in dates.items() if v and k in labels and "1995-01-01" < v <= date.today().isoformat()]
    if not cands:
        return {"date": None, "source": None, "confidence": "unknown"}
    v, src = min(cands)
    conf = "good" if src.startswith("battery") else "approximate" if src.startswith("BIOS") else "low"
    return {"date": v, "source": src, "confidence": conf}


# --------------------------------------------------------------------------------------
def _windows() -> dict:
    import win32com.client  # type: ignore

    cim = win32com.client.GetObject("winmgmts:root\\cimv2")
    q = lambda sql: list(cim.ExecQuery(sql))
    out: dict = {"source": "Windows WMI"}
    for c in q("SELECT Manufacturer, Model, SystemFamily, SystemSKUNumber FROM Win32_ComputerSystem"):
        out.update(manufacturer=clean(c.Manufacturer), model=clean(c.Model), family=clean(c.SystemFamily),
                   sku=clean(c.SystemSKUNumber))
    for p in q("SELECT IdentifyingNumber, UUID, Version, Name FROM Win32_ComputerSystemProduct"):
        out.update(serial_number=clean(p.IdentifyingNumber), uuid=clean(p.UUID), model_version=clean(p.Version))
        out["model"] = out.get("model") or clean(p.Name)
    for b in q("SELECT SerialNumber, SMBIOSBIOSVersion, Manufacturer, ReleaseDate FROM Win32_BIOS"):
        out.update(bios_vendor=clean(b.Manufacturer), bios_version=clean(b.SMBIOSBIOSVersion),
                   bios_release_date=_wmi_date(b.ReleaseDate))
        out["serial_number"] = out.get("serial_number") or clean(b.SerialNumber)
    for m in q("SELECT Manufacturer, Product, SerialNumber FROM Win32_BaseBoard"):
        out.update(board_manufacturer=clean(m.Manufacturer), board_model=clean(m.Product), board_serial=clean(m.SerialNumber))
    for e in q("SELECT ChassisTypes, SerialNumber, SMBIOSAssetTag FROM Win32_SystemEnclosure"):
        types = list(e.ChassisTypes or [])
        out.update(chassis_serial=clean(e.SerialNumber), asset_tag=clean(e.SMBIOSAssetTag),
                   chassis=CHASSIS.get(int(types[0])) if types else None)
    for o in q("SELECT InstallDate FROM Win32_OperatingSystem"):
        out["os_install_date"] = _wmi_date(o.InstallDate)
    try:
        wmi = win32com.client.GetObject("winmgmts:root\\wmi")
        for b in wmi.ExecQuery("SELECT ManufactureDate, SerialNumber FROM BatteryStaticData"):
            out["battery_manufacture_date"] = _wmi_date(getattr(b, "ManufactureDate", None))
            out["battery_serial"] = clean(getattr(b, "SerialNumber", None))
    except Exception:
        pass
    return out


def _linux(dmi: str) -> dict:
    def rd(name):
        try:
            with open(os.path.join(dmi, name), encoding="utf-8", errors="replace") as f:
                return clean(f.read())
        except PermissionError:
            return "__denied__"
        except OSError:
            return None

    out: dict = {"source": "Linux DMI (/sys/class/dmi/id)"}
    denied = []
    fields = {"manufacturer": "sys_vendor", "model": "product_name", "model_version": "product_version",
              "family": "product_family", "sku": "product_sku", "serial_number": "product_serial",
              "uuid": "product_uuid", "bios_vendor": "bios_vendor", "bios_version": "bios_version",
              "board_manufacturer": "board_vendor", "board_model": "board_name", "board_serial": "board_serial",
              "chassis_serial": "chassis_serial", "asset_tag": "chassis_asset_tag"}
    for key, fn in fields.items():
        v = rd(fn)
        if v == "__denied__":
            denied.append(key)
            v = None
        out[key] = v
    out["bios_release_date"] = _us_date(rd("bios_date"))
    ct = rd("chassis_type")
    out["chassis"] = CHASSIS.get(int(ct)) if ct and ct.isdigit() else None
    if denied:
        out["needs_admin_for"] = denied
    for bat in sorted(os.listdir("/sys/class/power_supply")) if os.path.isdir("/sys/class/power_supply") else []:
        if not bat.startswith("BAT"):
            continue
        base = os.path.join("/sys/class/power_supply", bat)
        try:
            y, mth, d = (int(open(os.path.join(base, f"manufacture_{p}")).read()) for p in ("year", "month", "day"))
            out["battery_manufacture_date"] = date(y, mth, d).isoformat()
        except (OSError, ValueError):
            pass
        out["battery_serial"] = clean(_try_read(os.path.join(base, "serial_number")))
        break
    for marker in ("/var/log/installer", "/lost+found"):
        try:
            out["os_install_date"] = date.fromtimestamp(os.stat(marker).st_ctime).isoformat()
            break
        except OSError:
            continue
    return out


def _try_read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def _mac() -> dict:
    raw = subprocess.check_output(["system_profiler", "SPHardwareDataType", "-json"], text=True, timeout=15)
    hw = json.loads(raw)["SPHardwareDataType"][0]
    return {"source": "macOS system_profiler", "manufacturer": "Apple", "model": clean(hw.get("machine_name")),
            "model_version": clean(hw.get("machine_model")), "serial_number": clean(hw.get("serial_number")),
            "uuid": clean(hw.get("platform_UUID")), "bios_version": clean(hw.get("boot_rom_version"))}


def collect() -> dict:
    try:
        if sys.platform == "win32":
            out = _windows()
        elif sys.platform == "darwin":
            out = _mac()
        else:
            out = _linux(os.environ.get("NPU_MONITOR_DMI_DIR", "/sys/class/dmi/id"))
    except Exception as exc:
        out = {"source": None, "error": f"identity not available: {exc}"}
    out["manufacture"] = estimate_manufacture(out)
    out["serial_number"] = out.get("serial_number") or out.get("chassis_serial") or out.get("board_serial")
    out["available"] = bool(out.get("manufacturer") or out.get("model") or out.get("serial_number"))
    return out
