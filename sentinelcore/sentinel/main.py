"""3C ITS VisionOps application entry point (Python package: sentinel).

    uvicorn sentinel.main:app --host 0.0.0.0 --port 8080
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import auth, devices, ops, org, usecases
from .config import settings
from .db import Base, SessionLocal, engine
from .health import collector
from .seed import bootstrap, seed_demo

log = logging.getLogger("sentinel")
STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        pw = bootstrap(db)
        if pw:
            log.warning("Created first user 'admin' with password: %s  (change it after first login)", pw)
        if settings.seed_demo and seed_demo(db):
            log.warning("Demo fleet created (simulated devices). Demo users use password Demo@12345")
    stop = asyncio.Event()
    task = asyncio.create_task(collector.run_forever(stop)) if settings.collector_enabled else None
    yield
    stop.set()
    if task:
        await task


app = FastAPI(title="3C ITS VisionOps", version=ops.VERSION, lifespan=lifespan)
app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(ops.router)
app.include_router(org.router)
app.include_router(usecases.router)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
        # Everything is served locally: no CDN, works air-gapped.
        resp.headers.setdefault("Content-Security-Policy",
                                "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
                                "connect-src 'self'; frame-ancestors 'none'")
    return resp


@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"ok": True}


app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")
