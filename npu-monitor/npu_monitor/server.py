"""FastAPI app: REST + WebSocket API and the offline dashboard."""
from __future__ import annotations

import asyncio
import csv
import io
import os
import hmac
import platform
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from . import alerts as alert_rules
from . import hwinfo, predict
from .assessment import compare
from .fleet import TOKEN_HEADER, FleetManager
from .inference.engine import EngineManager
from .jobs import JobManager, list_reports, load_report
from .report_html import render as render_report
from .sources.files import SUPPORTED
from .sources.live import LiveSource
from .telemetry.sampler import Sampler, impact

STATIC = os.path.join(os.path.dirname(__file__), "static")
MAX_UPLOAD = int(os.environ.get("NPU_MONITOR_MAX_UPLOAD_MB", "200")) * 1024 * 1024
LOOPBACK = {"127.0.0.1", "::1", "localhost", "testclient"}


def _authorised(client_host: str | None, header: str | None, query: str | None) -> bool:
    """Local requests are always allowed; remote ones need NPU_MONITOR_TOKEN."""
    if (client_host or "") in LOOPBACK:
        return True
    token = os.environ.get("NPU_MONITOR_TOKEN", "")
    if not token:
        return False  # never expose an unauthenticated API to the network
    given = header or query or ""
    return hmac.compare_digest(given.encode(), token.encode())


class PeerReq(BaseModel):
    url: str
    token: str = ""
    name: str = ""


class LiveStart(BaseModel):
    mode: str = "camera"          # "camera" | "screen"
    device: str | None = None
    camera_index: int = 0
    monitor: int = 1
    max_fps: float = 30.0


class AssessReq(BaseModel):
    seconds: float = 8.0


class BenchmarkReq(BaseModel):
    devices: list[str] = []
    seconds: float = 10.0


def create_app(sampler: Sampler | None = None, engines: EngineManager | None = None) -> FastAPI:
    state: dict = {}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        state["sampler"] = sampler or Sampler(float(os.environ.get("NPU_MONITOR_INTERVAL", "0.5")))
        state["engines"] = engines or EngineManager()
        state["live"] = LiveSource(state["engines"])
        state["jobs"] = JobManager(state["engines"], state["sampler"])
        state["hw"] = hwinfo.collect()
        state["notifier"] = alert_rules.Notifier()
        state["alerts"] = []
        state["fleet"] = FleetManager(node, state["jobs"])
        state["sampler"].start()
        stop = threading.Event()
        threading.Thread(target=alert_loop, args=(stop,), name="alerts", daemon=True).start()
        yield
        stop.set()
        state["live"].stop()
        state["sampler"].stop()

    _report_cache: dict = {}

    def latest_report() -> dict | None:
        saved = list_reports()
        if not saved:
            return None
        fn = saved[0]["file"]
        if _report_cache.get("file") != fn:
            try:
                _report_cache.update(file=fn, report=load_report(fn))
            except (OSError, ValueError):
                return None
        return _report_cache["report"]

    def battery_view() -> dict:
        smp = state["sampler"]
        latest = smp.latest() or {}
        bat = latest.get("battery") or {"present": False}
        forecast = predict.health_forecast(bat)
        model = predict.workload_model(latest_report(), bat)
        return {
            "battery": bat,
            "runtime": predict.runtime(smp.since(900)),
            "forecast": forecast,
            "log": predict.read_log()[-90:],
            "impact_model": model,
            "lifespan": predict.npu_lifespan_benefit(forecast, model),
            "temps": latest.get("temps", {}),
        }

    def compute_alerts() -> list[dict]:
        smp = state["sampler"]
        latest = smp.latest()
        bat = (latest or {}).get("battery") or {}
        return alert_rules.evaluate(state["hw"], [d.as_dict() for d in state["engines"].devices], latest,
                                    smp.since(30), predict.runtime(smp.since(900)), predict.health_forecast(bat))

    def alert_loop(stop: threading.Event) -> None:
        while not stop.wait(5.0):
            try:
                state["alerts"] = compute_alerts()
                state["notifier"].update(state["hw"].get("host", ""), state["alerts"])
                latest = state["sampler"].latest()
                if latest:
                    predict.log_battery_daily(latest.get("battery") or {})
            except Exception as exc:
                print(f"[alerts] {exc}")

    def node() -> dict:
        """Compact live summary of this machine, polled by fleet hubs."""
        s = state["sampler"].latest() or {}
        rep = latest_report()
        bat = s.get("battery") or {}
        return {
            "host": state["hw"].get("host"), "cpu": state["hw"].get("cpu"), "os": state["hw"].get("os"),
            "machine_type": state["hw"].get("machine_type"), "ai_pc": state["hw"].get("ai_pc"),
            "rated_npu": state["hw"].get("rated_npu"), "npu_names": state["hw"].get("npu_names"),
            "devices": [d.as_dict() for d in state["engines"].devices],
            "metrics": s and {"npu": s["npu"]["util"], "npu_source": s["npu"]["source"], "cpu": s["cpu"]["util"],
                              "gpu": max((g["util"] for g in s["gpu"]), default=None) if s["gpu"] else None,
                              "mem": s["cpu"]["mem_used_pct"], "power_w": s["cpu"]["power_w"],
                              "ips": round(sum(v["ips"] for v in s["inference"].values()), 1)},
            "battery": bat.get("present") and {k: bat.get(k) for k in ("percent", "plugged", "health_pct", "cycles", "power_w")},
            "alerts": [{"level": a["level"], "title": a["title"]} for a in state["alerts"]],
            "report": rep and {"score": rep["score"], "verdict": rep["verdict"], "created": rep["created"],
                               "npu_ips": rep["metrics"].get("npu_ips")},
        }

    app = FastAPI(title="NPU Monitor", version="1.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def auth(request: Request, call_next):
        if request.url.path.startswith("/api") or request.url.path == "/":
            if not _authorised(request.client and request.client.host, request.headers.get(TOKEN_HEADER),
                               request.query_params.get("token")):
                return JSONResponse({"detail": "token required"}, 401)
        return await call_next(request)

    app.mount("/static", StaticFiles(directory=STATIC), name="static")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(os.path.join(STATIC, "index.html"))

    # --- system & telemetry ----------------------------------------------------
    @app.get("/api/system")
    def system():
        return {
            "host": platform.node(), "os": f"{platform.system()} {platform.release()}",
            "cpu": platform.processor() or platform.machine(),
            "hardware": state["hw"],
            "telemetry": state["sampler"].describe(),
            "inference": state["engines"].describe(),
            "supported_files": sorted(SUPPORTED),
        }

    @app.get("/api/metrics")
    def metrics():
        return state["sampler"].latest() or {}

    @app.get("/api/history")
    def history(seconds: float = Query(120, ge=1, le=3600)):
        return state["sampler"].since(seconds)

    @app.get("/api/impact")
    def impact_view(seconds: float = Query(300, ge=10, le=3600)):
        return impact(state["sampler"].since(seconds))

    @app.get("/api/export.csv")
    def export_csv(seconds: float = Query(900, ge=1, le=3600)):
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["timestamp", "phase", "npu_util", "npu_source", "npu_app_util", "cpu_util",
                    "app_cpu_util", "gpu_util_max", "mem_used_pct", "power_w", "battery_pct", "battery_w",
                    "battery_health_pct", "plugged", "workloads"])
        for s in state["sampler"].since(seconds):
            w.writerow([round(s["ts"], 3), s["phase"], s["npu"]["util"], s["npu"]["source"], s["npu"]["app_util"],
                        s["cpu"]["util"], s["cpu"]["app_util"], max((g["util"] for g in s["gpu"]), default=""),
                        s["cpu"]["mem_used_pct"], s["cpu"]["power_w"] if s["cpu"]["power_w"] is not None else "",
                        *(("", "", "", "") if not s.get("battery", {}).get("present") else
                          (s["battery"].get("percent"), s["battery"].get("power_w"), s["battery"].get("health_pct"),
                           s["battery"].get("plugged"))),
                        ";".join(f"{k}={v}" for k, v in s["workloads"].items())])
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=npu-telemetry.csv"})

    @app.websocket("/ws/metrics")
    async def ws_metrics(ws: WebSocket):
        if not _authorised(ws.client and ws.client.host, ws.headers.get(TOKEN_HEADER), ws.query_params.get("token")):
            await ws.close(code=4401)
            return
        await ws.accept()
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue(maxsize=20)

        def push(sample):
            def put():
                if queue.full():
                    queue.get_nowait()
                queue.put_nowait(sample)
            loop.call_soon_threadsafe(put)

        state["sampler"].subscribe(push)
        try:
            while True:
                s = await queue.get()
                await ws.send_json({"sample": s, "live": state["live"].status})
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            state["sampler"].unsubscribe(push)

    # --- live camera / screen ----------------------------------------------------
    @app.post("/api/live/start")
    def live_start(req: LiveStart):
        try:
            return state["live"].start(req.mode, req.device, req.camera_index, req.max_fps, req.monitor)
        except Exception as exc:
            raise HTTPException(400, str(exc))

    @app.post("/api/live/stop")
    def live_stop():
        state["live"].stop()
        return state["live"].status

    @app.get("/api/live/status")
    def live_status():
        return state["live"].status

    @app.get("/api/live/stream")
    async def live_stream():
        async def frames():
            last = -1
            while True:
                fid, jpg = state["live"].latest_jpeg()
                if jpg is not None and fid != last:
                    last = fid
                    yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n"
                elif not state["live"].status.get("running"):
                    if jpg is None:
                        break
                await asyncio.sleep(0.02)
        return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")

    @app.post("/api/frame")
    async def classify_frame(request: Request, device: str | None = None):
        """Browser-camera path: the page posts a JPEG frame, we infer on it."""
        body = await request.body()
        if not body or len(body) > 10 * 1024 * 1024:
            raise HTTPException(400, "send one JPEG/PNG frame (max 10 MB) as the request body")
        try:
            img = Image.open(io.BytesIO(body)).convert("RGB")
            return await asyncio.to_thread(state["engines"].get(device).classify, img, "browser-camera", 3)
        except Exception as exc:
            raise HTTPException(400, str(exc))

    # --- documents ---------------------------------------------------------------
    @app.post("/api/files")
    async def upload(files: list[UploadFile] = File(...), device: str | None = Form(None), repeat: int = Form(1)):
        payload, total = [], 0
        for f in files:
            data = await f.read()
            total += len(data)
            if total > MAX_UPLOAD:
                raise HTTPException(413, f"upload exceeds {MAX_UPLOAD // 1024 // 1024} MB")
            payload.append((os.path.basename(f.filename or "upload"), data))
        job = state["jobs"].submit_files(payload, device or None, repeat)
        return {"id": job["id"]}

    # --- benchmark & jobs ----------------------------------------------------------
    @app.post("/api/benchmark")
    def benchmark(req: BenchmarkReq):
        job = state["jobs"].submit_benchmark(req.devices, req.seconds)
        return {"id": job["id"]}

    # --- NPU suitability assessment -----------------------------------------------
    @app.post("/api/assessment")
    def run_assessment(req: AssessReq):
        job = state["jobs"].submit_assessment(req.seconds)
        return {"id": job["id"]}

    @app.get("/api/reports")
    def reports():
        return list_reports()

    @app.get("/api/reports/{filename}")
    def report_json(filename: str):
        try:
            return load_report(filename)
        except (OSError, ValueError):
            raise HTTPException(404, "report not found")

    @app.get("/api/reports/{filename}/html", response_class=HTMLResponse)
    def report_page(filename: str):
        try:
            return render_report(load_report(filename))
        except (OSError, ValueError):
            raise HTTPException(404, "report not found")

    @app.post("/api/compare")
    def compare_machines(reports: list[dict]):
        """Body: a list of report JSON objects (from this or other machines)."""
        valid = [r for r in reports if isinstance(r, dict) and "hardware" in r and "score" in r]
        if len(valid) < 1:
            raise HTTPException(400, "send one or more assessment report JSON objects")
        return compare(valid)

    # --- node / battery / alerts ----------------------------------------------------
    @app.get("/api/node")
    def node_view():
        return node()

    @app.get("/api/battery")
    def battery():
        return battery_view()

    @app.get("/api/alerts")
    def alerts_view():
        return {"active": state["alerts"], "history": state["notifier"].history[-50:],
                "ai_pc": state["hw"].get("ai_pc"), "webhook": bool(state["notifier"].url)}

    # --- fleet ----------------------------------------------------------------------
    @app.get("/api/fleet")
    def fleet_status():
        return state["fleet"].status()

    @app.post("/api/fleet/peers")
    def fleet_add(req: PeerReq):
        try:
            return state["fleet"].add(req.url, req.token, req.name)
        except Exception as exc:
            raise HTTPException(400, f"could not reach {req.url}: {exc}")

    @app.delete("/api/fleet/peers/{peer_id}")
    def fleet_remove(peer_id: str):
        state["fleet"].remove(peer_id)
        return {"ok": True}

    @app.post("/api/fleet/run")
    def fleet_run(req: AssessReq):
        return {"id": state["fleet"].start_run(max(3.0, min(req.seconds, 60.0)))["id"]}

    @app.get("/api/fleet/runs/{run_id}")
    def fleet_run_status(run_id: str):
        r = state["fleet"].runs.get(run_id)
        if r is None:
            raise HTTPException(404, "run not found")
        return r

    @app.get("/api/jobs")
    def jobs():
        return state["jobs"].summary()

    @app.get("/api/jobs/{job_id}")
    def job(job_id: str):
        j = state["jobs"].jobs.get(job_id)
        if j is None:
            return JSONResponse({"detail": "not found"}, 404)
        return j

    return app


app = create_app()
