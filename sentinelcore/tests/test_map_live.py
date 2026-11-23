import shutil

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from sentinel.config import settings
from sentinel.db import ensure_columns
from sentinel.main import app

PW = "Passw0rd!!"
needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def login(client, u, p=PW):
    r = client.post("/api/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def env(client):
    admin = login(client, "admin", "Admin@123456")
    org = client.post("/api/orgs", headers=admin, json={"name": "Map Org", "code": "MAPO"}).json()
    other = client.post("/api/orgs", headers=admin, json={"name": "Map Other", "code": "MAPX"}).json()
    root = client.get(f"/api/locations?org_id={org['id']}", headers=admin).json()[0]["id"]
    other_root = client.get(f"/api/locations?org_id={other['id']}", headers=admin).json()[0]["id"]
    client.patch(f"/api/locations/{root}", headers=admin, json={"name": "Corporate Office", "kind": "corporate",
                                                               "latitude": 12.97, "longitude": 77.59})
    branch = client.post("/api/locations", headers=admin, json={"name": "Map Branch", "parent_id": root,
                         "latitude": 19.12, "longitude": 72.85}).json()["id"]
    floor = client.post("/api/locations", headers=admin, json={"name": "Floor 1", "parent_id": branch, "kind": "floor"}).json()["id"]
    client.post("/api/users", headers=admin, json={"username": "map_admin", "role": "org_admin", "org_id": org["id"], "password": PW})
    client.post("/api/users", headers=admin, json={"username": "map_viewer", "role": "viewer", "org_id": org["id"],
                                                    "location_ids": [branch], "password": PW})
    h = login(client, "map_admin")
    mk = lambda name, loc, **kw: client.post("/api/cameras", headers=h, json={"name": name, "location_id": loc,  # noqa: E731
                                              "rtsp_url": "rtsp://10.6.0.1/s", "driver": "simulator", **kw}).json()
    cams = {"branch": mk("Branch Gate", branch), "floor": mk("Floor Dome", floor),
            "own": mk("Yard Pole", branch, latitude=19.13, longitude=72.86)}
    other_cam = client.post("/api/cameras", headers=admin, json={"name": "Other Cam", "location_id": other_root,
                            "rtsp_url": "rtsp://10.6.0.9/s", "driver": "simulator"}).json()
    return {"admin": admin, "h": h, "org": org, "root": root, "branch": branch, "floor": floor, "cams": cams,
            "other_cam": other_cam}


def test_map_coordinates_inherit_and_scope(client, env):
    m = client.get("/api/map", headers=env["h"]).json()
    by = {c["name"]: c for c in m["cameras"]}
    assert (by["Branch Gate"]["lat"], by["Branch Gate"]["source"]) == (19.12, "location")
    assert (by["Floor Dome"]["lat"], by["Floor Dome"]["source"]) == (19.12, "above")   # floor has none: uses the branch
    assert (by["Yard Pole"]["lat"], by["Yard Pole"]["source"]) == (19.13, "camera")
    assert "Other Cam" not in by and m["unplaced"] == 0
    assert m["tile_url"] == ""                                                          # offline by default
    v = login(client, "map_viewer")
    assert {c["name"] for c in client.get("/api/map", headers=v).json()["cameras"]} == {"Branch Gate", "Floor Dome", "Yard Pole"}
    unplaced = client.get("/api/map", headers=env["admin"]).json()
    assert unplaced["unplaced"] >= 1                                                    # other org's HQ has no coordinates


def test_quality_cap_follows_org_and_camera(client, env):
    h, cam = env["h"], env["cams"]["branch"]["id"]
    info = client.get(f"/api/cameras/{cam}/live-info", headers=h).json()
    assert info["max_quality"] == "moderate" and [q["allowed"] for q in info["qualities"]] == [True, True, False]
    assert client.patch(f"/api/orgs/{env['org']['id']}", headers=h, json={"live_quality": "ultra"}).status_code == 422
    assert client.patch(f"/api/orgs/{env['org']['id']}", headers=h, json={"live_quality": "low"}).json()["live_quality"] == "low"
    assert client.get(f"/api/cameras/{cam}/live-info", headers=h).json()["max_quality"] == "low"
    body = {**client.get(f"/api/cameras/{cam}", headers=h).json(), "live_quality": "high"}
    body = {k: body[k] for k in ("name", "location_id", "rtsp_url", "driver", "live_quality")}
    assert client.patch(f"/api/cameras/{cam}", headers=h, json={**body, "live_quality": "4k"}).status_code == 422
    assert client.patch(f"/api/cameras/{cam}", headers=h, json=body).status_code == 200
    assert client.get(f"/api/cameras/{cam}/live-info", headers=h).json()["max_quality"] == "high"
    v = login(client, "map_viewer")
    assert client.patch(f"/api/orgs/{env['org']['id']}", headers=v, json={"live_quality": "high"}).status_code == 403


def read_until_jpeg(client, url, headers, limit=400_000):
    with client.stream("GET", url, headers=headers) as r:
        assert r.status_code == 200, r.read()
        buf = b""
        for chunk in r.iter_bytes():
            buf += chunk
            if b"\xff\xd8" in buf and b"Content-type: image/jpeg" in buf or len(buf) > limit:
                break
        return r.headers, buf


@needs_ffmpeg
def test_live_stream_mjpeg_and_cap(client, env, monkeypatch):
    monkeypatch.setattr(settings, "live_max_minutes", 1)
    h, cam = env["h"], env["cams"]["floor"]["id"]   # org default is now low
    headers, buf = read_until_jpeg(client, f"/api/cameras/{cam}/live.mjpg?quality=high", h)
    assert headers["x-live-quality"] == "low"         # asked for high, capped to the allowed level
    assert headers["content-type"].startswith("multipart/x-mixed-replace")
    assert b"--ffmpeg" in buf and b"\xff\xd8" in buf   # multipart boundary and a JPEG frame
    rows = client.get("/api/audit?limit=50", headers=h).json()
    assert any(r["action"] == "live_view" and r["target"] == "Floor Dome" for r in rows)


def test_live_stream_limits(client, env, monkeypatch):
    h = env["h"]
    v = login(client, "map_viewer")
    assert client.get(f"/api/cameras/{env['other_cam']['id']}/live.mjpg", headers=v).status_code == 404
    monkeypatch.setattr(settings, "max_live_streams", 0)
    if shutil.which("ffmpeg"):
        assert client.get(f"/api/cameras/{env['cams']['own']['id']}/live.mjpg", headers=h).status_code == 429
    monkeypatch.setattr(settings, "max_live_streams", 8)
    client.post(f"/api/cameras/{env['cams']['own']['id']}/enabled", headers=h, json={"enabled": False})
    assert client.get(f"/api/cameras/{env['cams']['own']['id']}/live.mjpg", headers=h).status_code == 409


def test_existing_database_is_upgraded_in_place(tmp_path):
    eng = create_engine(f"sqlite:///{tmp_path}/old.db")
    with eng.begin() as c:
        c.execute(text("CREATE TABLE organizations (id INTEGER PRIMARY KEY, name VARCHAR(160), code VARCHAR(20), "
                       "active BOOLEAN, require_approval BOOLEAN, created_at DATETIME)"))
        c.execute(text("INSERT INTO organizations (name, code, active, require_approval) VALUES ('Old', 'OLD', 1, 0)"))
    added = ensure_columns(eng)
    assert "organizations.live_quality" in added
    with eng.connect() as c:
        assert c.execute(text("SELECT live_quality, name FROM organizations")).one() == ("moderate", "Old")
    assert ensure_columns(eng) == []   # second run changes nothing
