"""Alert rules evaluated on live telemetry, plus optional webhook delivery.

Set ``NPU_MONITOR_WEBHOOK=https://your-intranet/hook`` to receive a JSON POST
whenever an alert starts (on-prem ticketing, Teams/Slack gateways, SIEM...).
"""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.request

LEVEL_ORDER = {"critical": 0, "warning": 1, "info": 2}


def evaluate(hw: dict, devices: list[dict], latest: dict | None, recent: list[dict], runtime: dict,
             forecast: dict) -> list[dict]:
    alerts: list[dict] = []
    add = lambda level, code, title, detail: alerts.append(
        {"level": level, "code": code, "title": title, "detail": detail})
    ai = hw.get("ai_pc", {})
    has_npu_backend = any(d["kind"] == "npu" for d in devices)

    if not ai.get("is_ai_pc"):
        add("critical", "not_ai_pc", f"{hw.get('host')} is not an AI PC",
            f"{hw.get('cpu')}: {ai.get('reason')}. AI features will load the CPU/GPU and drain the battery faster. "
            "Consider an Intel Core Ultra, AMD Ryzen AI or Snapdragon X machine for on-device AI.")
    elif not has_npu_backend:
        add("warning", "npu_no_runtime", "NPU present but not usable",
            "The NPU hardware is detected, but no AI runtime can use it. Install OpenVINO (Intel), "
            "Ryzen AI Software (AMD) or onnxruntime-qnn (Snapdragon).")
    elif ai.get("class") == "AI PC":
        add("info", "below_copilot", "AI PC, but below the Copilot+ class", ai.get("reason", ""))

    if latest:
        b = latest.get("battery") or {}
        if b.get("present"):
            h = b.get("health_pct")
            if h is not None and h < 60:
                add("critical", "battery_worn", f"Battery health {h}%",
                    "Capacity is under 60% of design. Replace the battery.")
            elif h is not None and h < 80:
                add("warning", "battery_worn", f"Battery health {h}%",
                    "Capacity is below 80% of design (common end-of-life point). Plan a replacement.")
            if not b.get("plugged") and b.get("percent") is not None and b["percent"] < 20:
                eta = runtime.get("empty_min")
                add("warning", "battery_low", f"Battery at {b['percent']}%",
                    f"About {eta} min left at the current draw." if eta else "Connect the charger soon.")
            elif not b.get("plugged") and runtime.get("empty_min") is not None and runtime["empty_min"] < 30:
                add("warning", "battery_runtime", f"~{runtime['empty_min']} min of battery left", "At the current power draw.")
        if forecast.get("available") and 0 < forecast.get("days_to_80", 10**6) < 180:
            add("warning", "battery_forecast", "Battery predicted to reach 80% health within 6 months",
                f"Estimated date {forecast['date_80']} ({forecast['method']}).")

    if has_npu_backend and recent:
        cpu_ai = [s for s in recent if "cpu" in s.get("inference", {}) and "npu" not in s.get("inference", {})]
        if len(cpu_ai) >= max(4, len(recent) // 2):
            add("warning", "ai_on_cpu", "AI is running on the CPU although an NPU is available",
                "Switch the workload to the NPU device to free the CPU and save battery.")
        hot = [s for s in recent if s["cpu"]["util"] > 85 and s["npu"]["util"] < 2]
        if len(hot) >= max(6, int(len(recent) * 0.8)):
            add("info", "cpu_busy_npu_idle", "CPU is saturated while the NPU sits idle",
                "If this load is AI (camera effects, transcription, local models), run it on the NPU instead.")
    alerts.sort(key=lambda a: LEVEL_ORDER[a["level"]])
    return alerts


class Notifier:
    """Remembers active alerts and POSTs newly started ones to a webhook."""

    def __init__(self) -> None:
        self.url = os.environ.get("NPU_MONITOR_WEBHOOK", "").strip()
        self._active: set[str] = set()
        self.history: list[dict] = []

    def update(self, host: str, alerts: list[dict]) -> None:
        codes = {a["code"] for a in alerts}
        new = [a for a in alerts if a["code"] not in self._active]
        self._active = codes
        for a in new:
            self.history.append({**a, "ts": time.time()})
        del self.history[:-200]
        if self.url and new:
            body = json.dumps({"host": host, "alerts": new, "ts": time.time()}).encode()
            threading.Thread(target=self._post, args=(body,), daemon=True).start()

    def _post(self, body: bytes) -> None:
        try:
            req = urllib.request.Request(self.url, data=body, headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=5).close()
        except Exception as exc:
            print(f"[alerts] webhook failed: {exc}")
