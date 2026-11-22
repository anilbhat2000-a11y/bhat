"""Predictive analysis: battery runtime, battery wear, and the NPU's effect on both.

Every prediction states its method and inputs so it can be checked. Models:

* **Time to empty / full** - two estimates: stored energy ÷ current draw, and a
  least-squares trend of charge % over the last minutes (smoother under bursty load).
* **Workload model** - to sustain a workload needing ``R`` inferences/s, a device
  measured at ``ips`` inferences/s flat-out is busy ``u = R / ips`` of the time.
  Its CPU, GPU and power are interpolated linearly between the idle baseline and
  the flat-out measurement: ``x(R) = idle + (full - idle) * u``. Simple, and
  accurate enough to rank devices; it ignores the DVFS non-linearity.
* **Battery wear** - Li-ion wear scales mainly with charge throughput
  (equivalent full cycles) and heat. Fewer watts for the same work means fewer
  cycles per year, so the battery reaches 80 % health later.
* **Health forecast** - linear fit of logged health over days if ≥7 days of log,
  else wear-per-cycle (100 % - health) ÷ cycles extrapolated at the logged or
  assumed cycle rate.
"""
from __future__ import annotations

import json
import os
import time
from datetime import date

DATA_DIR = os.environ.get("NPU_MONITOR_DATA", os.path.join(os.path.dirname(__file__), "..", "data"))
END_OF_LIFE_HEALTH = 80.0
TYPICAL_RATED_CYCLES = 800  # common laptop Li-ion spec: ~80 % capacity after 500-1000 cycles


def _linfit(xs: list[float], ys: list[float]) -> tuple[float, float] | None:
    n = len(xs)
    if n < 2:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return None
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return slope, my - slope * mx


# --------------------------------------------------------------------------------------
def runtime(samples: list[dict], window_s: float = 600) -> dict:
    """Time to empty (discharging) or full (charging), by two methods."""
    if not samples or not samples[-1].get("battery", {}).get("present"):
        return {"available": False}
    b = samples[-1]["battery"]
    out: dict = {"available": True, "status": b["status"], "percent": b["percent"]}
    p = b.get("power_w")
    if p and b.get("now_wh") is not None:
        if p > 0:
            out["empty_by_power_min"] = round(b["now_wh"] / p * 60)
        elif p < 0 and b.get("full_wh"):
            out["full_by_power_min"] = round((b["full_wh"] - b["now_wh"]) / -p * 60)
    t_end = samples[-1]["ts"]
    pts = [(s["ts"], s["battery"]["percent"]) for s in samples
           if s["ts"] >= t_end - window_s and s.get("battery", {}).get("percent") is not None
           and s["battery"].get("plugged") == b["plugged"]]
    fit = _linfit([t for t, _ in pts], [v for _, v in pts]) if len(pts) >= 20 and pts[-1][0] - pts[0][0] >= 120 else None
    if fit:
        slope_per_min = fit[0] * 60
        out["trend_pct_per_hour"] = round(slope_per_min * 60, 2)
        if slope_per_min < -0.005:
            out["empty_by_trend_min"] = round(b["percent"] / -slope_per_min)
        elif slope_per_min > 0.005:
            out["full_by_trend_min"] = round((100 - b["percent"]) / slope_per_min)
    if b.get("os_secs_left"):
        out["empty_by_os_min"] = round(b["os_secs_left"] / 60)
    picks = [out.get(k) for k in ("empty_by_trend_min", "empty_by_power_min", "empty_by_os_min") if out.get(k)]
    out["empty_min"] = picks[0] if picks else None
    return out


# --------------------------------------------------------------------------------------
def workload_model(report: dict | None, battery: dict | None, rate: float = 30.0,
                   hours_per_day: float = 4.0) -> dict:
    """Cost of sustaining ``rate`` inferences/s (default: a 30 FPS AI camera) on each processor."""
    if not report:
        return {"available": False, "reason": "run the NPU assessment first"}
    bench = report.get("benchmark", {})
    base = bench.get("baseline") or {}
    full_wh = (battery or {}).get("full_wh") or (report.get("battery") or {}).get("full_wh")
    rows = []
    for r in bench.get("results", []):
        if r.get("error") or not r.get("ips"):
            continue
        d = r["during"]
        u = min(1.0, rate / r["ips"])
        lerp = lambda k: None if d.get(k) is None or base.get(k) is None else round(base[k] + (d[k] - base[k]) * u, 1)
        row = {"device": r["device"], "kind": r["kind"], "label": r["label"], "sustains": r["ips"] >= rate,
               "busy_pct": round(u * 100, 1), "cpu_pct": lerp("cpu"), "gpu_pct": lerp("gpu"), "power_w": lerp("power_w")}
        if row["power_w"] and full_wh:
            row["battery_h"] = round(full_wh / row["power_w"], 1)
            row["cycles_per_year"] = round(row["power_w"] * hours_per_day * 365 / full_wh)
        rows.append(row)
    if not rows:
        return {"available": False, "reason": "no successful device measurements in the report"}
    by_kind = {}
    for r in rows:  # best (lowest power, else lowest CPU) row per kind
        k = r["kind"]
        key = (r["power_w"] if r["power_w"] is not None else 1e9, r["cpu_pct"] or 0)
        if k not in by_kind or key < by_kind[k][0]:
            by_kind[k] = (key, r)
    best = {k: v[1] for k, v in by_kind.items()}
    out = {"available": True, "rate": rate, "hours_per_day": hours_per_day, "rows": rows,
           "power_measured": any(r["power_w"] is not None for r in rows),
           "power_source": (report.get("metrics") or {}).get("power_source"), "findings": []}
    npu = best.get("npu")
    f = out["findings"]
    for other in ("cpu", "gpu"):
        o = best.get(other)
        if not (npu and o):
            continue
        name = other.upper()
        if npu["cpu_pct"] is not None and o["cpu_pct"] is not None and o["cpu_pct"] - npu["cpu_pct"] >= 2:
            f.append(f"CPU load drops from {o['cpu_pct']}% to {npu['cpu_pct']}% when the {rate:g} inf/s workload moves "
                     f"from the {name} to the NPU ({round(o['cpu_pct'] - npu['cpu_pct'], 1)} points freed).")
        if other == "gpu" and npu["gpu_pct"] is not None and o["gpu_pct"] is not None and o["gpu_pct"] - npu["gpu_pct"] >= 2:
            f.append(f"GPU load drops from {o['gpu_pct']}% to {npu['gpu_pct']}%, leaving the GPU free for display, video and games.")
        if npu.get("power_w") and o.get("power_w") and (o["power_w"] - npu["power_w"]) / o["power_w"] >= 0.05:
            pct = round((o["power_w"] - npu["power_w"]) / o["power_w"] * 100)
            line = f"Power falls from {o['power_w']} W to {npu['power_w']} W ({pct}% less) compared with the {name}"
            if npu.get("battery_h") and o.get("battery_h"):
                line += f", so battery life with this workload is {npu['battery_h']} h instead of {o['battery_h']} h"
            f.append(line + ".")
            if other == "cpu" and npu.get("cycles_per_year") is not None and o.get("cycles_per_year"):
                f.append(f"At {hours_per_day:g} h/day that is ~{npu['cycles_per_year']} battery cycles/year instead of "
                         f"~{o['cycles_per_year']}. Fewer cycles and less heat slow battery wear.")
    if not out["power_measured"]:
        out["findings"].append("Power could not be measured. Run the assessment on battery (charger unplugged) "
                               "to quantify battery life and battery-wear benefits.")
    return out


# --------------------------------------------------------------------------------------
def _log_path() -> str:
    return os.path.join(DATA_DIR, "battery_log.jsonl")


def log_battery_daily(battery: dict) -> None:
    """Append one health record per day (keeps the forecast going across restarts)."""
    if not battery.get("present") or battery.get("health_pct") is None:
        return
    today = date.today().isoformat()
    path = _log_path()
    try:
        last = None
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    last = line
        if last and json.loads(last).get("date") == today:
            return
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps({"date": today, "health_pct": battery["health_pct"], "cycles": battery.get("cycles"),
                                "full_wh": battery.get("full_wh"), "design_wh": battery.get("design_wh")}) + "\n")
    except (OSError, ValueError):
        pass


def read_log() -> list[dict]:
    try:
        with open(_log_path(), encoding="utf-8") as f:
            return [json.loads(x) for x in f if x.strip()]
    except (OSError, ValueError):
        return []


def health_forecast(battery: dict, log: list[dict] | None = None, assumed_cycles_per_day: float = 0.6) -> dict:
    if not battery.get("present") or battery.get("health_pct") is None:
        return {"available": False, "reason": "battery health not reported by this system"}
    h, cycles = battery["health_pct"], battery.get("cycles")
    log = log if log is not None else read_log()
    out: dict = {"available": True, "health_pct": h, "cycles": cycles,
                 "condition": "good" if h >= 90 else "fair" if h >= END_OF_LIFE_HEALTH else "replace soon" if h >= 60 else "replace"}
    days = [(date.fromisoformat(e["date"]).toordinal(), e["health_pct"]) for e in log if e.get("health_pct") is not None]
    cyc_rate = None
    with_cycles = [(date.fromisoformat(e["date"]).toordinal(), e["cycles"]) for e in log if e.get("cycles")]
    if len(with_cycles) >= 2 and with_cycles[-1][0] - with_cycles[0][0] >= 7:
        f = _linfit([d for d, _ in with_cycles], [c for _, c in with_cycles])
        cyc_rate = round(f[0], 2) if f and f[0] > 0 else None
    out["cycles_per_day"] = cyc_rate or assumed_cycles_per_day
    out["cycles_per_day_source"] = "measured from log" if cyc_rate else "assumed typical laptop use"

    if h <= END_OF_LIFE_HEALTH:
        out["days_to_80"] = 0
        out["method"] = "already at or below 80% health"
    elif len(days) >= 2 and days[-1][0] - days[0][0] >= 7:
        f = _linfit([d for d, _ in days], [v for _, v in days])
        if f and f[0] < 0:
            out["days_to_80"] = round((h - END_OF_LIFE_HEALTH) / -f[0])
            out["wear_pct_per_year"] = round(-f[0] * 365, 1)
            out["method"] = f"trend of {len(days)} daily health readings"
    if "days_to_80" not in out:
        if cycles and cycles >= 20 and h < 100:
            wear_per_cycle = (100 - h) / cycles
            out["method"] = f"wear per cycle so far ({round(wear_per_cycle, 4)}% per cycle)"
        else:
            wear_per_cycle = (100 - END_OF_LIFE_HEALTH) / TYPICAL_RATED_CYCLES
            out["method"] = f"typical Li-ion rating ({TYPICAL_RATED_CYCLES} cycles to 80%)"
        out["wear_pct_per_cycle"] = round(wear_per_cycle, 4)
        out["days_to_80"] = round((h - END_OF_LIFE_HEALTH) / wear_per_cycle / out["cycles_per_day"])
        out["wear_pct_per_year"] = round(wear_per_cycle * out["cycles_per_day"] * 365, 1)
    out["date_80"] = date.fromordinal(date.today().toordinal() + out["days_to_80"]).isoformat()
    out["log_days"] = len(days)
    return out


def npu_lifespan_benefit(forecast: dict, model: dict) -> dict | None:
    """Translate fewer cycles/year on the NPU into extra months before 80 % health."""
    if not (forecast.get("available") and model.get("available")) or forecast.get("days_to_80", 0) <= 0:
        return None
    rows = {r["kind"]: r for r in model["rows"] if r.get("cycles_per_year") is not None}
    npu = min((r for r in model["rows"] if r["kind"] == "npu" and r.get("cycles_per_year") is not None),
              key=lambda r: r["cycles_per_year"], default=None)
    alt = rows.get("cpu") or rows.get("gpu")
    if not (npu and alt) or alt["cycles_per_year"] <= npu["cycles_per_year"]:
        return None
    wear = forecast.get("wear_pct_per_cycle") or (100 - END_OF_LIFE_HEALTH) / TYPICAL_RATED_CYCLES
    room = forecast["health_pct"] - END_OF_LIFE_HEALTH
    yrs_alt = room / (wear * alt["cycles_per_year"])
    yrs_npu = room / (wear * npu["cycles_per_year"]) if npu["cycles_per_year"] else float("inf")
    months = round((yrs_npu - yrs_alt) * 12)
    return {
        "years_to_80_ai_on_npu": round(yrs_npu, 1),
        f"years_to_80_ai_on_{alt['kind']}": round(yrs_alt, 1),
        "extra_months": months,
        "text": (f"Scenario: battery use is mainly {model['hours_per_day']:g} h/day of this AI workload. On the NPU that is "
                 f"~{npu['cycles_per_year']} cycles/year instead of ~{alt['cycles_per_year']} on the {alt['kind'].upper()}, so the "
                 f"battery reaches 80% health after ~{round(yrs_npu, 1)} years instead of ~{round(yrs_alt, 1)} years "
                 f"(about {months} month{'s' if months != 1 else ''} longer)."),
    }
