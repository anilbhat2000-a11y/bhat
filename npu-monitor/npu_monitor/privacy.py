"""Keep the app fully on-prem: opt out of third-party usage telemetry.

The ``openvino`` pip package bundles ``openvino-telemetry``, which treats a
*missing* consent file as consent and sends usage statistics to Google
Analytics. Before OpenVINO is imported we write the vendor's own opt-out
marker ("0") - but only if the user has not already recorded a choice.
Set NPU_MONITOR_ALLOW_VENDOR_TELEMETRY=1 to leave the vendor default alone.
"""
from __future__ import annotations

import os


def opt_out_vendor_telemetry() -> str | None:
    if os.environ.get("NPU_MONITOR_ALLOW_VENDOR_TELEMETRY") == "1":
        return None
    try:
        from openvino_telemetry.utils.opt_in_checker import OptInChecker
    except Exception:
        return None  # telemetry package not installed: nothing to do
    try:
        checker = OptInChecker()
        path = checker.consent_file()
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path  # respect an explicit earlier choice
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write("0")
        return path
    except Exception:
        return None
