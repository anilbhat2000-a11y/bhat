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

from .api import auth, devices, live as live_api, ops, org, usecases
from .config import settings
from .db import Base, SessionLocal, engine, ensure_columns
from .health import collector
from .seed import bootstrap, seed_demo

log = logging.getLogger("sentinel")
# Map tiles may come from a configured tile server; allow only that origin for images.
MAP_TILE_ORIGIN = ""
if settings.map_tile_url.startswith(("http://", "https://")):
    from urllib.parse import urlsplit as _us
    _u = _us(settings.map_tile_url.replace("{s}", "a"))
    MAP_TILE_ORIGIN = f"{_u.scheme}://{_u.netloc}".replace("://a.", "://*.") if "{s}" in settings.map_tile_url else f"{_u.scheme}://{_u.netloc}"
STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    if settings.log_file:
        from logging.handlers import RotatingFileHandler
        Path(settings.log_file).parent.mkdir(parents=True, exist_ok=True)
        fh = RotatingFileHandler(settings.log_file, maxBytes=5_000_000, backupCount=5, encoding="utf-8")
        fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        logging.getLogger().addHandler(fh)
        logging.getLogger().setLevel(logging.INFO)
    Base.metadata.create_all(engine)
    added = ensure_columns(engine)
    if added:
        log.warning("Database upgraded: added %s", ", ".join(added))
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
app.include_router(live_api.router)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.url.path == "/" or request.url.path.startswith("/static/"):
        # Browsers must check for a newer copy each time, so portal updates show
        # immediately after a restart (unchanged files still come from cache via 304).
        resp.headers.setdefault("Cache-Control", "no-cache")
    if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
        # Everything is served locally: no CDN, works air-gapped.
        resp.headers.setdefault("Content-Security-Policy",
                                f"default-src 'self'; img-src 'self' data: {MAP_TILE_ORIGIN}; style-src 'self'; script-src 'self'; "
                                "connect-src 'self'; frame-ancestors 'none'")
    return resp


@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"ok": True}


app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")
