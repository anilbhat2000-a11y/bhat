"""NPU suitability assessment: *why* is (or isn't) this machine good for NPU work?

Input is a benchmark (idle baseline + the same model run flat-out on the best
NPU, GPU and CPU device) plus hardware identity. Output is a 0-100 score, a
verdict, and evidence-backed reasons, so the answer is never "trust me":
each reason quotes the measured numbers behind it.

Criteria that cannot be measured on a machine (no power sensor, no GPU
counter, unknown TOPS rating) are left out of the score rather than guessed,
and the score is normalised over what *was* measured.

``compare()`` ranks several machines' reports and explains why the winner wins.
"""
from __future__ import annotations

import time

VERSION = 1

# (key, title, max points)
CRITERIA = [
    ("npu_working", "NPU present and running AI", 20),
    ("throughput", "NPU speed vs CPU", 20),
    ("cpu_headroom", "CPU left free while NPU works", 20),
    ("realtime", "Real-time capability (camera FPS)", 15),
    ("efficiency", "Energy efficiency vs CPU", 10),
    ("gpu_free", "GPU left free for graphics", 10),
    ("rated_tops", "Vendor-rated NPU TOPS", 5),
]
VERDICTS = [(75, "Excellent for NPU workloads"), (55, "Good for NPU workloads"),
            (35, "Limited NPU benefit"), (0, "Not recommended for NPU workloads")]


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def _best(results: list[dict], kind: str) -> dict | None:
    ok = [r for r in results if r.get("kind") == kind and not r.get("error") and r.get("ips")]
    return max(ok, key=lambda r: r["ips"]) if ok else None


def _eff(r: dict | None) -> float | None:
    """Inferences per joule = inferences/s ÷ watts."""
    if not r:
        return None
    w = r.get("during", {}).get("power_w")
    return round(r["ips"] / w, 2) if w else None


def assess(hw: dict, bench: dict, model: str, power_source: str | None = None,
           battery: dict | None = None) -> dict:
    results = bench.get("results", [])
    base = bench.get("baseline") or {}
    npu, gpu, cpu = _best(results, "npu"), _best(results, "gpu"), _best(results, "cpu")
    npu_failed = [r for r in results if r.get("kind") == "npu" and r.get("error")]
    rated = hw.get("rated_npu") or {}
    hw_npu_seen = bool(hw.get("npu_names") or rated.get("tops"))

    scores: dict[str, float | None] = {}
    pros: list[str] = []
    cons: list[str] = []
    recs: list[str] = []

    # 1. NPU present and working
    if npu:
        scores["npu_working"] = 1.0
        pros.append(f"NPU is detected and runs AI inference ({npu['label']}).")
    elif npu_failed:
        scores["npu_working"] = 0.25
        cons.append(f"An NPU backend exists but the model failed to run on it: {npu_failed[0]['error'][:160]}")
        recs.append("Update the NPU driver (Intel: 'Intel AI Boost' driver; AMD: Ryzen AI driver; Qualcomm: Snapdragon NPU driver) and re-run.")
    elif hw_npu_seen:
        scores["npu_working"] = 0.25
        cons.append("The processor has an NPU, but no inference backend can use it yet.")
        recs.append("Install the NPU runtime: OpenVINO (Intel), Ryzen AI Software (AMD) or onnxruntime-qnn (Snapdragon).")
    else:
        scores["npu_working"] = 0.0
        cons.append("No NPU found. AI work has to run on the CPU or GPU here.")
        if hw.get("machine_type") == "server":
            recs.append("Servers rarely include NPUs. Use the GPU, or add an AI accelerator card, for heavy AI work.")
        else:
            recs.append("For on-device AI with low power use, choose a laptop with an NPU (Intel Core Ultra, AMD Ryzen AI, Snapdragon X).")

    # 2. Throughput vs CPU
    speedup = round(npu["ips"] / cpu["ips"], 2) if npu and cpu else None
    if npu and cpu:
        scores["throughput"] = _clamp(speedup / 3)
        (pros if speedup >= 1 else cons).append(
            f"NPU runs the model at {npu['ips']} inferences/s, {speedup}× the CPU ({cpu['ips']}/s).")
    elif not npu:
        scores["throughput"] = 0.0
    else:
        scores["throughput"] = None  # no CPU reference measured
    gpu_vs_npu = round(npu["ips"] / gpu["ips"], 2) if npu and gpu else None
    if gpu_vs_npu is not None and gpu_vs_npu < 1:
        cons.append(f"The GPU is faster for raw throughput ({gpu['ips']}/s vs NPU {npu['ips']}/s). "
                    "Use the GPU for large batch jobs and the NPU for sustained, low-power work.")

    # 3. CPU headroom while the NPU works flat-out
    offload = None
    if npu:
        headroom = round(100 - npu["during"]["cpu"], 1)
        scores["cpu_headroom"] = _clamp((headroom - 50) / 35)
        msg = f"While the NPU runs at full speed the CPU is only {npu['during']['cpu']}% busy, leaving {headroom}% free for other apps."
        if cpu:
            net_npu = max(0.5, npu["during"]["cpu"] - base.get("cpu", 0)) / npu["ips"]
            net_cpu = max(0.5, cpu["during"]["cpu"] - base.get("cpu", 0)) / cpu["ips"]
            offload = round(net_cpu / net_npu, 1)
            msg += f" Each inference costs {offload}× less CPU time on the NPU than on the CPU."
        (pros if headroom >= 70 else cons).append(msg)
    else:
        scores["cpu_headroom"] = 0.0
        if cpu:
            cons.append(f"Running AI on the CPU takes {cpu['during']['cpu']}% CPU, which slows everything else down.")

    # 4. Real-time capability
    fps = round(1000 / npu["latency_mean_ms"], 1) if npu else None
    if npu:
        scores["realtime"] = 1.0 if fps >= 60 else 0.8 if fps >= 30 else 0.45 if fps >= 15 else 0.2
        jitter = round(npu["latency_p95_ms"] / npu["latency_mean_ms"], 2)
        txt = f"NPU latency is {npu['latency_mean_ms']} ms (p95 {npu['latency_p95_ms']} ms), about {fps} FPS for a live camera"
        (pros if fps >= 30 else cons).append(txt + (", smooth real-time video." if fps >= 30 else ", below the 30 FPS needed for smooth video."))
        if jitter > 2:
            cons.append(f"NPU latency is uneven (p95 is {jitter}× the mean). Check for power-saving modes or competing NPU apps.")
    else:
        scores["realtime"] = 0.0

    # 5. Energy efficiency (only with a power reading)
    e_npu, e_cpu = _eff(npu), _eff(cpu)
    if e_npu and e_cpu:
        ratio = round(e_npu / e_cpu, 2)
        scores["efficiency"] = _clamp(ratio / 3)
        (pros if ratio >= 1 else cons).append(
            f"NPU does {e_npu} inferences per joule vs CPU {e_cpu}, {ratio}× more work per watt "
            f"({power_source or 'power sensor'}). That means longer battery life and less heat.")
        full_wh = (battery or {}).get("full_wh")
        if full_wh and npu["during"].get("power_w") and cpu["during"].get("power_w"):
            hn = round(full_wh / npu["during"]["power_w"], 1)
            hc = round(full_wh / cpu["during"]["power_w"], 1)
            pros.append(f"At full AI load a full battery ({full_wh} Wh) lasts ~{hn} h on the NPU vs ~{hc} h on the CPU.")
    elif not npu:
        scores["efficiency"] = 0.0
    else:
        scores["efficiency"] = None
        recs.append("To measure energy efficiency, unplug the charger (battery power reading) and re-run. "
                    "On Linux, give read access to /sys/class/powercap for CPU package power.")

    # 6. GPU left free
    if npu and npu["during"].get("gpu") is not None and bench.get("gpu_measured", True):
        added = round(npu["during"]["gpu"] - base.get("gpu", 0), 1)
        scores["gpu_free"] = 1.0 if added <= 5 else 0.6 if added <= 15 else 0.2
        if added <= 5:
            pros.append(f"The GPU stays free (+{max(added, 0)}% while the NPU works), so graphics, video and games are unaffected.")
        else:
            cons.append(f"GPU load rises by {added}% during NPU work. Part of the model may be falling back to the GPU.")
    elif not npu:
        scores["gpu_free"] = 0.0
    else:
        scores["gpu_free"] = None

    # 7. Vendor-rated TOPS
    tops = rated.get("tops")
    if tops:
        scores["rated_tops"] = 1.0 if tops >= 40 else 0.6 if tops >= 16 else 0.4
        if rated.get("copilot_plus"):
            pros.append(f"{rated['family']}: {tops} NPU TOPS (vendor rating). It meets the 40 TOPS Copilot+ PC bar for Windows AI features.")
        else:
            cons.append(f"{rated['family']}: {tops} NPU TOPS (vendor rating), below the 40 TOPS Copilot+ PC bar. "
                        "Fine for camera effects and light models, limited for larger models.")
    else:
        scores["rated_tops"] = 0.0 if not hw_npu_seen else None

    earned = sum(s * pts for (k, _, pts) in CRITERIA if (s := scores.get(k)) is not None)
    possible = sum(pts for (k, _, pts) in CRITERIA if scores.get(k) is not None)
    score = round(earned / possible * 100) if possible else 0
    verdict = next(v for t, v in VERDICTS if score >= t)

    def pick(cands, key):
        cands = [c for c in cands if c]
        return max(cands, key=key) if cands else None

    rt = pick([r for r in (npu, gpu, cpu) if r and 1000 / r["latency_mean_ms"] >= 30],
              key=lambda r: (r["kind"] == "npu", -r["during"]["cpu"]))
    batch = pick([npu, gpu, cpu], key=lambda r: r["ips"])
    eff_best = pick([npu, gpu, cpu], key=lambda r: (_eff(r) or 0, r["kind"] == "npu", -r["during"]["cpu"]))
    workloads = [
        {"workload": "Live camera AI (video calls, detection)",
         "device": rt and rt["label"], "kind": rt and rt["kind"],
         "why": (f"{round(1000 / rt['latency_mean_ms'])} FPS while the CPU is {rt['during']['cpu']}% busy" if rt
                 else "no device reached 30 FPS with this model")},
        {"workload": "Batch documents, images, PDFs, Excel",
         "device": batch and batch["label"], "kind": batch and batch["kind"],
         "why": f"highest throughput, {batch['ips']} inferences/s" if batch else "no device measured"},
        {"workload": "Always-on and on-battery background AI",
         "device": eff_best and eff_best["label"], "kind": eff_best and eff_best["kind"],
         "why": (f"{_eff(eff_best)} inferences per joule" if eff_best and _eff(eff_best)
                 else f"lowest CPU load ({eff_best['during']['cpu']}%)" if eff_best else "no device measured")},
    ]
    if npu and scores.get("throughput", 0) and speedup and speedup < 1.5:
        recs.append("Use an INT8-quantised model; NPUs are fastest with INT8 and often 2–4× quicker than FP32/FP16.")
    if npu:
        recs.append("Route always-on AI (camera effects, transcription, background indexing) to the NPU to keep the CPU and GPU free.")

    return {
        "version": VERSION,
        "created": time.time(),
        "hardware": hw,
        "battery": battery if (battery or {}).get("present") else None,
        "model": model,
        "score": score,
        "verdict": verdict,
        "criteria": [
            {"key": k, "title": t, "max": pts,
             "points": None if scores.get(k) is None else round(scores[k] * pts, 1)}
            for k, t, pts in CRITERIA
        ],
        "metrics": {
            "npu_ips": npu and npu["ips"], "gpu_ips": gpu and gpu["ips"], "cpu_ips": cpu and cpu["ips"],
            "npu_latency_ms": npu and npu["latency_mean_ms"], "npu_fps": fps,
            "speedup_vs_cpu": speedup, "npu_vs_gpu": gpu_vs_npu,
            "cpu_busy_on_npu": npu and npu["during"]["cpu"], "cpu_busy_on_cpu": cpu and cpu["during"]["cpu"],
            "cpu_offload_factor": offload,
            "npu_inf_per_joule": e_npu, "cpu_inf_per_joule": e_cpu, "power_source": power_source,
            "rated_tops": tops,
        },
        "pros": pros,
        "cons": cons,
        "recommendations": recs,
        "workloads": workloads,
        "benchmark": bench,
    }


# --------------------------------------------------------------------------------------
def compare(reports: list[dict]) -> dict:
    """Rank machines and explain, with numbers, why the top one is best for NPU work."""
    if not reports:
        return {"ranking": [], "why_best": [], "warnings": ["no reports given"]}
    warnings = []
    models = {r.get("model") for r in reports}
    if len(models) > 1:
        warnings.append(f"Reports used different models ({', '.join(sorted(map(str, models)))}). "
                        "Speed numbers are only directly comparable with the same model.")

    def m(r, k):
        return (r.get("metrics") or {}).get(k)

    ranked = sorted(reports, key=lambda r: (r.get("score", 0), m(r, "npu_ips") or 0), reverse=True)
    label = lambda r: r["hardware"].get("fleet_name") or r["hardware"].get("host", "?")
    name = lambda r: f"{label(r)} ({r['hardware'].get('cpu', '?')})"
    ranking = [{
        "rank": i + 1, "host": label(r), "cpu": r["hardware"].get("cpu"),
        "machine_type": r["hardware"].get("machine_type"), "score": r.get("score"), "verdict": r.get("verdict"),
        "npu_ips": m(r, "npu_ips"), "npu_fps": m(r, "npu_fps"), "speedup_vs_cpu": m(r, "speedup_vs_cpu"),
        "cpu_busy_on_npu": m(r, "cpu_busy_on_npu"), "npu_inf_per_joule": m(r, "npu_inf_per_joule"),
        "rated_tops": m(r, "rated_tops"),
    } for i, r in enumerate(ranked)]

    best, rest = ranked[0], ranked[1:]
    why = [f"{name(best)} has the highest NPU suitability score: {best['score']}/100 ({best['verdict']})."]
    if not rest:
        return {"ranking": ranking, "best": ranking[0], "why_best": why, "caveats": [], "warnings": warnings}

    caveats = []
    checks = [  # metric, higher is better?, phrase, unit
        ("npu_ips", True, "NPU throughput", " inf/s"),
        ("npu_fps", True, "real-time camera rate", " FPS"),
        ("speedup_vs_cpu", True, "NPU speed-up over its own CPU", "×"),
        ("cpu_busy_on_npu", False, "CPU load while the NPU works", "%"),
        ("npu_inf_per_joule", True, "NPU energy efficiency", " inf/J"),
        ("rated_tops", True, "vendor-rated NPU TOPS", " TOPS"),
    ]
    for key, higher, phrase, unit in checks:
        b = m(best, key)
        others = [(name(r), m(r, key)) for r in rest if m(r, key) is not None]
        if b is None or not others:
            if b is None and others and key != "npu_inf_per_joule":
                caveats.append(f"{phrase.capitalize()} could not be measured on {name(best)}.")
            continue
        top_other = max(others, key=lambda o: o[1] if higher else -o[1])
        better = b > top_other[1] if higher else b < top_other[1]
        detail = f"{b}{unit} vs {top_other[1]}{unit} on {top_other[0]}"
        if better:
            why.append(f"{'Best' if higher else 'Lowest'} {phrase}: {detail}.")
        elif b != top_other[1]:
            caveats.append(f"{top_other[0]} leads on {phrase} ({top_other[1]}{unit} vs {b}{unit}).")
    if best["hardware"].get("rated_npu", {}).get("copilot_plus") and not all(
            r["hardware"].get("rated_npu", {}).get("copilot_plus") for r in rest):
        why.append("It is the only Copilot+-class machine (40+ NPU TOPS) in the comparison.")
    no_npu = [name(r) for r in rest if not m(r, "npu_ips")]
    if no_npu:
        why.append(f"These have no usable NPU, so their AI work loads the CPU/GPU: {', '.join(no_npu)}.")
    return {"ranking": ranking, "best": ranking[0], "why_best": why, "caveats": caveats, "warnings": warnings}
