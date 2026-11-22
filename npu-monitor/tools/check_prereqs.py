"""Prerequisite checker for 3C ITS AI PC Health Checker & NPU Performance.

Run BEFORE installing (only needs Python) and AFTER installing (also checks packages,
the NPU runtime and the camera):

    python tools/check_prereqs.py            # human-readable report
    python tools/check_prereqs.py --json     # machine-readable, for deployment tools

Exit code: 0 = ready, 1 = something required is missing (FAIL), 2 = ready with warnings.
"""
from __future__ import annotations

import importlib
import json
import os
import platform
import re
import shutil
import socket
import struct
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
results: list[dict] = []


def add(status: str, check: str, detail: str, fix: str = "") -> None:
    results.append({"status": status, "check": check, "detail": detail, "fix": fix})


def cpu_name() -> str:
    try:
        if sys.platform == "win32":
            import winreg

            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0") as k:
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


def total_ram_gb() -> float | None:
    try:
        import psutil

        return psutil.virtual_memory().total / 1e9
    except Exception:
        pass
    try:
        if sys.platform == "win32":
            import ctypes

            class MS(ctypes.Structure):
                _fields_ = [("l", ctypes.c_ulong), ("m", ctypes.c_ulong), ("t", ctypes.c_ulonglong)] + \
                           [(f"x{i}", ctypes.c_ulonglong) for i in range(6)]
            ms = MS()
            ms.l = ctypes.sizeof(MS)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(ms))
            return ms.t / 1e9
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1e9
    except Exception:
        return None


def npu_family(cpu: str) -> str:
    c = cpu.lower()
    if "core(tm) ultra" in c or "core ultra" in c:
        return "intel"
    if re.search(r"ryzen ai|ryzen [3579] (pro )?[78]\d40(u|hs|h)\b|ryzen [3579] (pro )?8[67]00g", c):
        return "amd"
    if "snapdragon" in c or "oryon" in c:
        return "qualcomm"
    return "none"


def main() -> int:
    os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")  # silence OpenCV's camera probing noise
    as_json = "--json" in sys.argv
    port = 8765
    for i, a in enumerate(sys.argv):
        if a == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])

    # --- operating system & Python ------------------------------------------------------
    osname = f"{platform.system()} {platform.release()} ({platform.version()})"
    if sys.platform == "win32":
        build = sys.getwindowsversion().build
        if build >= 22000:
            add("PASS", "Operating system", f"Windows 11 (build {build})")
        elif build >= 19045:
            add("WARN", "Operating system", f"Windows 10 22H2 (build {build})",
                "Works, but Windows 11 23H2+ is recommended: NPU drivers and Task Manager NPU counters need it.")
        else:
            add("FAIL", "Operating system", f"Windows build {build}", "Update to Windows 10 22H2 or Windows 11.")
    elif sys.platform.startswith("linux"):
        rel = platform.release()
        try:
            major, minor = (int(x) for x in rel.split(".")[:2])
        except ValueError:
            major, minor = 0, 0
        ok = (major, minor) >= (6, 6)
        add("PASS" if ok else "WARN", "Operating system", f"Linux kernel {rel}",
            "" if ok else "Kernel 6.6+ is needed for the Intel NPU driver (intel_vpu). Everything else works.")
    elif sys.platform == "darwin":
        add("WARN", "Operating system", osname, "macOS works for monitoring, but no NPU backend is supported on macOS.")
    else:
        add("WARN", "Operating system", osname, "Untested platform.")

    v = sys.version_info
    bits = struct.calcsize("P") * 8
    if bits != 64:
        add("FAIL", "Python", f"{platform.python_version()} {bits}-bit", "Install 64-bit Python 3.11 or 3.12.")
    elif (3, 11) <= (v.major, v.minor) <= (3, 12):
        add("PASS", "Python", f"{platform.python_version()} 64-bit ({platform.machine()})")
    elif (v.major, v.minor) == (3, 13):
        add("WARN", "Python", f"{platform.python_version()} 64-bit",
            "Works for Intel/CPU. Some NPU runtimes (Qualcomm QNN, AMD Ryzen AI) may need 3.11/3.12.")
    elif (v.major, v.minor) == (3, 10):
        add("WARN", "Python", platform.python_version(), "3.10 works but is near end of life; use 3.12.")
    else:
        add("FAIL", "Python", platform.python_version(), "Install Python 3.11 or 3.12 (64-bit) from python.org.")

    # --- hardware -------------------------------------------------------------------------
    cpu = cpu_name()
    fam = npu_family(cpu)
    add("PASS" if fam != "none" else "WARN", "Processor / NPU",
        f"{cpu} - {'NPU expected (' + fam + ')' if fam != 'none' else 'no NPU expected (not an AI PC)'}",
        "" if fam != "none" else "The app still runs and will report this machine as 'Not an AI PC'.")
    if fam == "qualcomm" and platform.machine().lower() not in ("arm64", "aarch64"):
        add("FAIL", "Python architecture", f"{platform.machine()} Python on a Snapdragon PC",
            "Install the ARM64 build of Python, otherwise the Hexagon NPU cannot be used.")

    ram = total_ram_gb()
    if ram is None:
        add("WARN", "Memory", "could not read")
    else:
        add("PASS" if ram >= 15 else "WARN" if ram >= 7.5 else "FAIL", "Memory", f"{ram:.1f} GB",
            "" if ram >= 15 else "8 GB minimum, 16 GB recommended.")

    free = shutil.disk_usage(ROOT).free / 1e9
    add("PASS" if free >= 3 else "WARN" if free >= 1.5 else "FAIL", "Free disk space", f"{free:.1f} GB on the install drive",
        "" if free >= 3 else "Allow 3 GB (packages ~1.5 GB, plus reports and logs).")

    try:
        test = os.path.join(ROOT, ".write_test")
        open(test, "w").close()
        os.remove(test)
        add("PASS", "Write access", ROOT)
    except OSError:
        add("FAIL", "Write access", ROOT, "Install into a folder this user can write to (e.g. C:\\3CITS or /opt/3cits).")

    # --- network port -------------------------------------------------------------------------
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", port))
            add("PASS", f"Port {port}", "free")
        except OSError:
            add("WARN", f"Port {port}", "already in use (the app may already be running)",
                f"Stop the other program or start with --port {port + 1}.")

    # --- packages (after install) ----------------------------------------------------------------
    req = {"fastapi": "fastapi", "uvicorn": "uvicorn", "numpy": "numpy", "PIL": "pillow", "psutil": "psutil",
           "cv2": "opencv-python-headless", "pymupdf": "pymupdf", "openpyxl": "openpyxl", "httpx": "httpx",
           "onnx": "onnx", "mss": "mss"}
    if sys.platform == "win32":
        req["win32com"] = "pywin32"
    missing = []
    for mod, pkg in req.items():
        try:
            importlib.import_module(mod)
        except Exception:
            missing.append(pkg)
    if missing:
        add("WARN", "Python packages", f"not installed yet: {', '.join(missing)}",
            "Run the installer (install\\windows\\install.ps1 or install/linux/install.sh).")
    else:
        add("PASS", "Python packages", "all required packages installed")
    try:
        importlib.import_module("websockets")
        add("PASS", "Live updates (WebSocket)", "available")
    except Exception:
        if not missing:
            add("FAIL", "Live updates (WebSocket)", "missing", "pip install \"uvicorn[standard]\"")

    # --- inference backends / NPU ----------------------------------------------------------------
    devices = []
    try:
        os.environ.setdefault("OPENVINO_TELEMETRY_OPT_OUT", "1")
        sys.path.insert(0, ROOT)
        try:
            from npu_monitor.privacy import opt_out_vendor_telemetry
            opt_out_vendor_telemetry()
        except Exception:
            pass
        import openvino as ov

        devices += [f"OpenVINO:{d}" for d in ov.Core().available_devices]
    except Exception:
        pass
    try:
        import onnxruntime as ort

        devices += [f"ORT:{p.replace('ExecutionProvider', '')}" for p in ort.get_available_providers()
                    if p != "AzureExecutionProvider"]
    except Exception:
        pass
    has_npu = any(x in d for d in devices for x in ("NPU", "QNN", "VitisAI"))
    if not devices:
        add("WARN" if missing else "FAIL", "AI runtime", "no inference backend installed",
            "Install requirements (OpenVINO or ONNX Runtime).")
    elif has_npu:
        add("PASS", "NPU runtime", ", ".join(devices))
    elif fam != "none":
        hint = {"intel": "Install/update the Intel NPU driver ('Intel AI Boost') and reboot.",
                "amd": "Install the AMD Ryzen AI driver and Ryzen AI Software, then reinstall into its Python environment.",
                "qualcomm": "pip install onnxruntime-qnn (in ARM64 Python) and update the Snapdragon NPU driver."}[fam]
        add("WARN", "NPU runtime", f"NPU not visible to the AI runtime. Available: {', '.join(devices)}", hint)
    else:
        add("PASS", "AI runtime", f"{', '.join(devices)} (GPU/CPU only on this machine)")

    try:
        os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")
        import cv2

        backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
        cap = cv2.VideoCapture(0, backend)
        ok = cap.isOpened()
        cap.release()
        add("PASS" if ok else "WARN", "Camera", "camera 0 available" if ok else "no camera found or access denied",
            "" if ok else ("Optional. Settings > Privacy & security > Camera > allow desktop apps, or use 'Camera via browser'."
                           if sys.platform == "win32" else "Optional. Add the user to the 'video' group, or use 'Camera via browser'."))
    except Exception:
        pass

    if sys.platform.startswith("linux"):
        readable = os.access("/sys/class/dmi/id/product_serial", os.R_OK)
        add("PASS" if readable else "WARN", "Serial number access", "readable" if readable else "needs root",
            "" if readable else "Run as root (or via the systemd service) to read serial numbers.")

    # --- report ---------------------------------------------------------------------------------
    worst = 1 if any(r["status"] == "FAIL" for r in results) else 2 if any(r["status"] == "WARN" for r in results) else 0
    if as_json:
        print(json.dumps({"ready": worst != 1, "results": results}, indent=1))
        return worst
    icon = {"PASS": "[ OK ]", "WARN": "[WARN]", "FAIL": "[FAIL]"}
    print("\n3C ITS AI PC Health Checker - prerequisite check\n" + "-" * 60)
    for r in results:
        print(f"{icon[r['status']]} {r['check']}: {r['detail']}")
        if r["fix"] and r["status"] != "PASS":
            print(f"        -> {r['fix']}")
    print("-" * 60)
    print({0: "READY: all checks passed.", 2: "READY with warnings (see above).",
           1: "NOT READY: fix the [FAIL] items above."}[worst])
    return worst


if __name__ == "__main__":
    sys.exit(main())
