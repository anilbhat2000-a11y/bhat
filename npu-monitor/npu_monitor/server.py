"""FastAPI app: REST + WebSocket API and the offline dashboard."""
from __future__ import annotations

import asyncio
import csv
import io
import os
import platform
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from .inference.engine import EngineManager
from .jobs import JobManager
from .sources.files import SUPPORTED
from .sources.live import LiveSource
from .telemetry.sampler import Sampler, impact

STATIC = os.path.join(os.path.dirname(__file__), "static")
MAX_UPLOAD = int(os.environ.get("NPU_MONITOR_MAX_UPLOAD_MB", "200")) * 1024 * 1024


class LiveStart(BaseModel):
    mode: str = "camera"          # "camera" | "screen"
    device: str | None = None
    camera_index: int = 0
    monitor: int = 1
    max_fps: float = 30.0


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
        state["sampler"].start()
        yield
        state["live"].stop()
        state["sampler"].stop()

    app = FastAPI(title="NPU Monitor", version="1.0.0", lifespan=lifespan)
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
                    "app_cpu_util", "gpu_util_max", "mem_used_pct", "cpu_power_w", "workloads"])
        for s in state["sampler"].since(seconds):
            w.writerow([round(s["ts"], 3), s["phase"], s["npu"]["util"], s["npu"]["source"], s["npu"]["app_util"],
                        s["cpu"]["util"], s["cpu"]["app_util"], max((g["util"] for g in s["gpu"]), default=""),
                        s["cpu"]["mem_used_pct"], s["cpu"]["power_w"] if s["cpu"]["power_w"] is not None else "",
                        ";".join(f"{k}={v}" for k, v in s["workloads"].items())])
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=npu-telemetry.csv"})

    @app.websocket("/ws/metrics")
    async def ws_metrics(ws: WebSocket):
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
