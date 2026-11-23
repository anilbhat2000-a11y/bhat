"""Camera map and live view."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import live
from ..audit import audit
from ..config import settings
from ..db import get_db
from ..models import Camera, DeviceState, Location, User
from ..security import ancestors, check_location, descendants, location_path, location_tree, require, scope_filter

router = APIRouter(prefix="/api", tags=["map & live"])


def _camera(db: Session, user: User, cam_id: int) -> Camera:
    cam = db.get(Camera, cam_id)
    if not cam:
        raise HTTPException(404, "Not found")
    check_location(db, user, cam.location_id)
    return cam


# --------------------------------------------------------------------- map --
@router.get("/map")
def camera_map(user: User = Depends(require("view")), db: Session = Depends(get_db), org_id: int | None = None,
               location_id: int | None = None):
    """Every camera the user can see, with map coordinates: the camera's own, or
    else those of its location or the nearest location above it that has them."""
    q = scope_filter(db, select(Camera).order_by(Camera.name), Camera.location_id, user)
    if org_id:
        q = q.where(Camera.location_id.in_(select(Location.id).where(Location.org_id == org_id)))
    if location_id:
        check_location(db, user, location_id)
        loc = db.get(Location, location_id)
        q = q.where(Camera.location_id.in_(descendants(location_tree(db, loc.org_id), {location_id})))
    cams = db.scalars(q).all()
    states = {s.device_id: s for s in db.scalars(select(DeviceState).where(
        DeviceState.device_type == "camera", DeviceState.device_id.in_([c.id for c in cams] or [-1])))}
    trees: dict[int, dict] = {}
    out, unplaced = [], 0
    for c in cams:
        tree = trees.setdefault(c.location.org_id, location_tree(db, c.location.org_id))
        lat, lng, source = c.latitude, c.longitude, "camera"
        if lat is None or lng is None:
            lat = lng = None
            for lid in ancestors(tree, c.location_id):
                loc = tree[lid]
                if loc.latitude is not None and loc.longitude is not None:
                    lat, lng = loc.latitude, loc.longitude
                    source = "location" if lid == c.location_id else "above"
                    break
        if lat is None:
            unplaced += 1
            continue
        st = states.get(c.id)
        status = "unknown" if st is None else ("online" if st.online else "offline")
        out.append({"id": c.id, "name": c.name, "lat": lat, "lng": lng, "source": source,
                    "status": status if c.enabled else "deactivated", "error": st.error if st else "",
                    "location_id": c.location_id, "location_path": location_path(tree, c.location_id),
                    "org": c.location.org.name, "zone": c.zone, "nvr": c.nvr.name if c.nvr else None})
    return {"cameras": out, "unplaced": unplaced, "tile_url": settings.map_tile_url,
            "attribution": settings.map_attribution}


# --------------------------------------------------------------- live view --
@router.get("/cameras/{cam_id}/live-info")
def live_info(cam_id: int, user: User = Depends(require("view")), db: Session = Depends(get_db)):
    cam = _camera(db, user, cam_id)
    cap = live.max_quality(cam)
    return {"camera_id": cam.id, "name": cam.name, "enabled": cam.enabled, "max_quality": cap,
            "camera_setting": cam.live_quality or "", "org_default": cam.location.org.live_quality,
            "available": live.available(), "simulated": cam.driver == "simulator",
            "max_minutes": settings.live_max_minutes,
            "qualities": [{"key": k, **{f: v for f, v in p.items() if f != "q"}, "allowed": live.RANK[k] <= live.RANK[cap]}
                          for k, p in live.QUALITY.items()]}


@router.get("/cameras/{cam_id}/live.mjpg")
async def live_stream(cam_id: int, request: Request, quality: str | None = None, user: User = Depends(require("view")),
                      db: Session = Depends(get_db)):
    cam = _camera(db, user, cam_id)
    if not cam.enabled:
        raise HTTPException(409, "This camera is deactivated")
    if not live.available():
        raise HTTPException(503, "FFmpeg is not installed on the server, so live view is not available")
    if cam.driver != "simulator" and not (cam.rtsp_url or cam.sub_stream_url):
        raise HTTPException(409, "This camera has no stream address")
    q = live.choose_quality(cam, quality)
    cmd = live.ffmpeg_command(cam, q)
    if not await live.try_reserve():
        raise HTTPException(429, f"The server is already showing {settings.max_live_streams} live streams. Try again shortly.")
    audit(db, user.username, "live_view", cam.name, {"quality": q}, request=request, org_id=cam.location.org_id)
    return StreamingResponse(live.mjpeg_stream(cmd, settings.live_max_minutes * 60),
                             media_type=f"multipart/x-mixed-replace;boundary={live.BOUNDARY}",
                             headers={"Cache-Control": "no-store", "X-Live-Quality": q})
