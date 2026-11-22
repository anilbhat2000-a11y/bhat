"""Background jobs: document processing and NPU-vs-GPU-vs-CPU benchmarks.

Jobs run one at a time on a single worker so their utilisation measurements do
not contaminate each other.
"""
from __future__ import annotations

import base64
import io
import json
import os
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from statistics import fmean

import numpy as np
from PIL import Image

from . import hwinfo, predict
from .assessment import assess
from .inference.engine import EngineManager, preprocess
from .sources.files import extract
from .telemetry.sampler import INFERENCE, Sampler, gpu_util, impact


def _thumb(img: Image.Image, size: int = 200) -> str:
    t = img.copy()
    t.thumbnail((size, size))
    buf = io.BytesIO()
    t.save(buf, "JPEG", quality=70)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _window_stats(samples: list[dict]) -> dict:
    if not samples:
        return {"samples": 0}
    powers = [s["cpu"]["power_w"] for s in samples if s["cpu"]["power_w"] is not None]
    return {
        "samples": len(samples),
        "npu": round(fmean(s["npu"]["util"] for s in samples), 1),
        "cpu": round(fmean(s["cpu"]["util"] for s in samples), 1),
        "app_cpu": round(fmean(s["cpu"]["app_util"] for s in samples), 1),
        "gpu": round(fmean(gpu_util(s) for s in samples), 1),
        "power_w": round(fmean(powers), 1) if powers else None,
    }


class JobManager:
    def __init__(self, engines: EngineManager, sampler: Sampler) -> None:
        self.engines, self.sampler = engines, sampler
        self.jobs: dict[str, dict] = {}
        self._pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="job")
        self._lock = threading.Lock()

    def _new(self, kind: str, **fields) -> dict:
        job = {"id": uuid.uuid4().hex[:12], "kind": kind, "status": "queued", "progress": 0.0,
               "created": time.time(), "error": None, **fields}
        with self._lock:
            self.jobs[job["id"]] = job
            # keep memory bounded: drop the oldest finished jobs
            done = [j for j in self.jobs.values() if j["status"] in ("done", "error")]
            for old in sorted(done, key=lambda j: j["created"])[:-25]:
                self.jobs.pop(old["id"], None)
        return job

    def summary(self) -> list[dict]:
        keep = ("id", "kind", "status", "progress", "created", "error", "device")
        return [{k: j.get(k) for k in keep} for j in sorted(self.jobs.values(), key=lambda j: -j["created"])]

    # --- document processing ----------------------------------------------------
    def submit_files(self, files: list[tuple[str, bytes]], device_id: str | None, repeat: int) -> dict:
        device_id = device_id or self.engines.default_device()
        job = self._new("files", device=device_id, repeat=repeat, files=[], items=[], stats=None)
        self._pool.submit(self._run_files, job, files, device_id, max(1, min(repeat, 200)))
        return job

    def _run_files(self, job: dict, files: list[tuple[str, bytes]], device_id: str, repeat: int) -> None:
        job["status"] = "running"
        INFERENCE.active["files"] = device_id
        t0 = time.time()
        try:
            engine = self.engines.get(device_id)
            extracted = []
            for name, data in files:
                try:
                    kind, items, summary = extract(name, data)
                    job["files"].append({"name": name, "kind": kind, "items": len(items), "summary": summary})
                    extracted += [(name, it) for it in items]
                except Exception as exc:
                    job["files"].append({"name": name, "error": str(exc)})
            if not extracted:
                raise RuntimeError("no processable content in the uploaded files")
            tensors = [preprocess(it.image) for _, it in extracted]
            latencies: list[float] = []
            total = len(extracted) * repeat
            for p in range(repeat):
                for i, ((fname, it), x) in enumerate(zip(extracted, tensors)):
                    if p == 0:
                        r = engine.classify(it.image, workload="files")
                        job["items"].append({"file": fname, "name": it.name, "meta": it.meta,
                                             "thumb": _thumb(it.image), **r})
                        latencies.append(r["latency_ms"])
                    else:  # sustained-load passes: inference only
                        _, lat = engine.infer(x, workload="files")
                        latencies.append(lat)
                    job["progress"] = round((p * len(extracted) + i + 1) / total, 3)
            t1 = time.time()
            time.sleep(self.sampler.interval * 2)  # let the trailing sample land
            lat = np.array(latencies)
            job["stats"] = {
                "inferences": len(latencies), "seconds": round(t1 - t0, 2),
                "ips": round(len(latencies) / max(t1 - t0, 1e-6), 1),
                "latency_mean_ms": round(float(lat.mean()), 2),
                "latency_p95_ms": round(float(np.percentile(lat, 95)), 2),
                "during": _window_stats(self.sampler.between(t0, t1)),
                "impact": impact(self.sampler.since(max(60.0, t1 - t0 + 30))),
            }
            job["status"] = "done"
        except Exception as exc:
            job["status"], job["error"] = "error", str(exc)
        finally:
            INFERENCE.active.pop("files", None)

    # --- benchmark --------------------------------------------------------------
    def submit_benchmark(self, device_ids: list[str], seconds: float) -> dict:
        device_ids = device_ids or [d.id for d in self.engines.devices]
        job = self._new("benchmark", devices=device_ids, seconds=seconds, baseline=None, results=[])
        self._pool.submit(self._run_benchmark, job, device_ids, max(3.0, min(seconds, 120.0)))
        return job

    def _run_benchmark(self, job: dict, device_ids: list[str], seconds: float) -> None:
        job["status"] = "running"
        try:
            self._bench(job, device_ids, seconds, len(device_ids) + 1)
            job["status"] = "done"
        except Exception as exc:
            job["status"], job["error"] = "error", str(exc)

    def _bench(self, job: dict, device_ids: list[str], seconds: float, steps: int) -> None:
        """Idle baseline, then each device flat-out for ``seconds``. Fills job['baseline'/'results']."""
        rng = np.random.default_rng(0)
        x = preprocess(Image.fromarray(rng.integers(0, 255, (480, 640, 3), dtype=np.uint8)))
        t0 = time.time()
        time.sleep(seconds / 2)
        job["baseline"] = _window_stats(self.sampler.between(t0, time.time()))
        job["progress"] = round(1 / steps, 3)
        for n, dev in enumerate(device_ids, 2):
            entry = {"device": dev}
            job["results"].append(entry)
            try:
                engine = self.engines.get(dev)
                entry.update(kind=engine.device.kind, label=engine.device.label, compile_ms=engine.compile_ms)
                INFERENCE.active["benchmark"] = dev
                lats: list[float] = []
                t0 = time.time()
                while time.time() - t0 < seconds:
                    _, lat = engine.infer(x, workload="benchmark")
                    lats.append(lat)
                t1 = time.time()
                INFERENCE.active.pop("benchmark", None)
                time.sleep(self.sampler.interval * 2)
                a = np.array(lats)
                entry.update(
                    ips=round(len(lats) / (t1 - t0), 1),
                    latency_mean_ms=round(float(a.mean()), 2),
                    latency_p95_ms=round(float(np.percentile(a, 95)), 2),
                    during=_window_stats(self.sampler.between(t0 + 0.5, t1)),  # skip ramp-up
                )
            except Exception as exc:
                kind = next((d.kind for d in self.engines.devices if d.id == dev), None)
                entry.update(kind=kind, error=str(exc))
            finally:
                INFERENCE.active.pop("benchmark", None)
            job["progress"] = round(n / steps, 3)
            time.sleep(1.5)  # cool-down so windows do not overlap

    # --- NPU suitability assessment ------------------------------------------------
    def submit_assessment(self, seconds: float) -> dict:
        # One device per kind (the list is sorted best-backend-first) plus every NPU,
        # so a machine with two NPU backends is judged on the better one.
        chosen, kinds = [], set()
        for d in self.engines.devices:
            if d.kind == "npu" or d.kind not in kinds:
                chosen.append(d.id)
                kinds.add(d.kind)
        job = self._new("assessment", devices=chosen, seconds=seconds, baseline=None, results=[], report=None)
        self._pool.submit(self._run_assessment, job, chosen, max(3.0, min(seconds, 60.0)))
        return job

    def _run_assessment(self, job: dict, device_ids: list[str], seconds: float) -> None:
        job["status"] = "running"
        try:
            self._bench(job, device_ids, seconds, len(device_ids) + 1)
            bench = {"baseline": job["baseline"], "results": job["results"], "seconds": seconds,
                     "gpu_measured": bool(self.sampler.gpu.sources)}
            power = next((s["cpu"].get("power_source") for s in reversed(self.sampler.since(120))
                          if s["cpu"].get("power_source")), None)
            latest = self.sampler.latest() or {}
            battery = latest.get("battery")
            report = assess(hwinfo.collect(), bench, self.engines.model.name, power, battery)
            model = predict.workload_model(report, battery)
            report["impact_model"] = model
            if battery and battery.get("present"):
                report["battery_lifespan"] = predict.npu_lifespan_benefit(predict.health_forecast(battery), model)
            report["id"] = job["id"]
            job["report"] = report
            save_report(report)
            job["status"] = "done"
        except Exception as exc:
            job["status"], job["error"] = "error", str(exc)


REPORTS_DIR = os.environ.get(
    "NPU_MONITOR_REPORTS", os.path.join(os.path.dirname(__file__), "..", "reports"))


def save_report(report: dict) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    host = re.sub(r"[^A-Za-z0-9_.-]", "_", report["hardware"].get("host") or "machine")
    report["file"] = f"{host}-{time.strftime('%Y%m%d-%H%M%S')}.json"
    path = os.path.join(REPORTS_DIR, report["file"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    return path


def list_reports() -> list[dict]:
    out = []
    if os.path.isdir(REPORTS_DIR):
        for fn in sorted(os.listdir(REPORTS_DIR), reverse=True):
            if fn.endswith(".json"):
                try:
                    with open(os.path.join(REPORTS_DIR, fn), encoding="utf-8") as f:
                        r = json.load(f)
                    out.append({"file": fn, "host": r["hardware"].get("host"), "cpu": r["hardware"].get("cpu"),
                                "score": r.get("score"), "verdict": r.get("verdict"), "created": r.get("created")})
                except (OSError, ValueError, KeyError):
                    continue
    return out


def load_report(filename: str) -> dict:
    fn = os.path.basename(filename)  # no path traversal
    with open(os.path.join(REPORTS_DIR, fn), encoding="utf-8") as f:
        return json.load(f)
