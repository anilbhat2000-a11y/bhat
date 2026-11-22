import pytest
from fastapi.testclient import TestClient

from sentinel.analytics.engine import Detection
from sentinel.analytics.runner import run
from sentinel.main import app
from sentinel.usecases import CATEGORIES, SECTORS, builtin_catalog

PW = "Passw0rd!!"


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
    org = client.post("/api/orgs", headers=admin, json={"name": "UC Org", "code": "UCO"}).json()
    root = [l for l in client.get(f"/api/locations?org_id={org['id']}", headers=admin).json()][0]["id"]
    branch = client.post("/api/locations", headers=admin, json={"name": "UC Branch", "parent_id": root}).json()["id"]
    other = client.post("/api/locations", headers=admin, json={"name": "UC Other", "parent_id": root}).json()["id"]
    client.post("/api/users", headers=admin, json={"username": "uc_admin", "role": "org_admin", "org_id": org["id"], "password": PW})
    client.post("/api/users", headers=admin, json={"username": "uc_viewer", "role": "viewer", "org_id": org["id"],
                                                    "location_ids": [branch], "password": PW})
    h = login(client, "uc_admin")
    cam = client.post("/api/cameras", headers=h, json={"name": "UC Cam", "location_id": branch,
                      "rtsp_url": "rtsp://10.7.0.5/s", "driver": "simulator", "username": "u", "password": "p"}).json()
    other_cam = client.post("/api/cameras", headers=h, json={"name": "UC Other Cam", "location_id": other,
                            "rtsp_url": "rtsp://10.7.0.6/s", "driver": "simulator"}).json()
    return {"admin": admin, "h": h, "org": org, "branch": branch, "other": other, "cam": cam, "other_cam": other_cam}


def test_builtin_catalog_is_consistent():
    cat = builtin_catalog()
    assert len({u["key"] for u in cat}) == len(cat) >= 180
    assert {u["sector"] for u in cat} == set(SECTORS)
    assert {u["category"] for u in cat} == set(CATEGORIES)


def test_catalog_listing_and_status(client, env):
    caps = {c["key"]: c for c in client.get("/api/capabilities", headers=env["admin"]).json()}
    assert caps["person_vehicle"]["installed"] is False and caps["pos"]["kind"] == "integration"
    ucs = {u["key"]: u for u in client.get("/api/use-cases", headers=env["h"]).json()}
    assert ucs["gen_tamper"]["status"] == "available"                  # built-in image health, no model needed
    assert ucs["gen_tailgating"]["status"] == "needs_model"
    assert ucs["bank_ej_clip"]["status"] == "needs_integration"
    assert ucs["it_laptop_exit"]["missing_integrations"] == ["gate_pass"]
    rows = client.get("/api/use-cases?sector=banking&category=Fraud%20%26%20Loss%20Prevention", headers=env["h"]).json()
    assert rows and all(r["sector"] == "banking" and r["category"] == "Fraud & Loss Prevention" for r in rows)


def test_enable_use_case_requires_model_then_works(client, env):
    h, cam = env["h"], env["cam"]["id"]
    r = client.post(f"/api/cameras/{cam}/use-cases", headers=h, json={"key": "bank_vault_dual"})
    assert r.status_code == 409 and "Person & vehicle detector" in r.json()["detail"]
    # only the platform admin can mark models/integrations installed
    assert client.patch("/api/capabilities/person_vehicle", headers=h, json={"installed": True}).status_code == 403
    client.patch("/api/capabilities/person_vehicle", headers=env["admin"], json={"installed": True, "note": "YOLOv8 on GPU"})
    client.patch("/api/capabilities/vault_alarm", headers=env["admin"], json={"installed": True})
    assert client.post(f"/api/cameras/{cam}/use-cases", headers=h, json={"key": "gen_watchlist"}).status_code == 422  # model-only
    assert client.post(f"/api/cameras/{cam}/use-cases", headers=h,
                       json={"key": "bank_vault_dual", "params": {"bogus": 1}}).status_code == 422
    r = client.post(f"/api/cameras/{cam}/use-cases", headers=h, json={
        "key": "bank_vault_dual", "polygon": [[0.2, 0.2], [0.8, 0.2], [0.8, 0.9], [0.2, 0.9]], "params": {"seconds": 15}})
    assert r.status_code == 200
    cfg = [a for a in r.json()["analytics"] if a["use_case"] == "bank_vault_dual"][0]
    assert cfg["type"] == "presence_required" and cfg["min_count"] == 2 and cfg["seconds"] == 15
    assert cfg["event_type"] == "bank_vault_dual"
    r = client.post(f"/api/cameras/{cam}/use-cases", headers=h, json={"key": "gen_tailgating",
                    "line": [[0.0, 0.5], [1.0, 0.5]]})
    assert r.status_code == 200
    uc = {u["key"]: u for u in client.get("/api/use-cases", headers=h).json()}
    assert uc["bank_vault_dual"]["enabled_cameras"] == 1 and uc["bank_vault_dual"]["status"] == "available"
    # viewer cannot change, and cannot see cameras outside scope
    v = login(client, "uc_viewer")
    assert client.post(f"/api/cameras/{cam}/use-cases", headers=v, json={"key": "gen_tailgating"}).status_code == 403
    r = client.delete(f"/api/cameras/{cam}/use-cases/gen_tailgating", headers=h)
    assert [a["use_case"] for a in r.json()["analytics"]] == ["bank_vault_dual"]


def test_edge_config_and_runner_post_use_case_events(client, env):
    h = env["h"]
    key = client.post("/api/edge-devices", headers=h, json={"name": "uc-edge", "location_id": env["branch"]}).json()["api_key"]
    client.post(f"/api/cameras/{env['other_cam']['id']}/use-cases", headers=h, json={"key": "gen_intrusion"})
    cfg = client.get("/api/edge/config", headers={"X-Edge-Key": key}).json()
    assert [c["camera_id"] for c in cfg["cameras"]] == [env["cam"]["id"]]   # other location is outside its subtree
    cam_cfg = cfg["cameras"][0]
    assert cam_cfg["url"] == "rtsp://u:p@10.7.0.5/s" and cam_cfg["analytics"][0]["use_case"] == "bank_vault_dual"
    posted = []

    class OnePerson:
        def detect(self, frame, w, h):
            return [Detection("person", 0.9, (0.45, 0.4, 0.55, 0.8))]
    ticks = iter(range(0, 100, 5))
    sent = run("http://unused", key, env["cam"]["id"], (b"" for _ in range(6)), OnePerson(), 640,
               cam_cfg["analytics"], clock=lambda: next(ticks), post=posted.append)
    assert sent == 1 and posted[0]["type"] == "bank_vault_dual" and posted[0]["details"]["required"] == 2
    r = client.post("/api/edge/events", json={**posted[0], "ts": None}, headers={"X-Edge-Key": key})  # fake clock → server time
    assert r.status_code == 201
    stats = client.get("/api/events/stats", headers=h).json()
    assert stats["by_type"]["bank_vault_dual"]["name"].startswith("Two custodians")
    assert stats["by_category"]["Compliance & Audit"] >= 1


def test_coverage_and_import(client, env):
    cov = client.get("/api/use-cases/coverage", headers=env["h"]).json()
    banking = [s for s in cov["sectors"] if s["sector"] == "banking"][0]
    assert banking["target"] == 40 and banking["total"] >= 10
    assert cov["totals"]["target"] == 500
    assert any(m["key"] == "face" for m in cov["unlock"]["models"])
    csv = ("key,sector,category,name,capabilities,integrations,rule_type,classes,severity\n"
           "gen_watchlist,general,Security & Threat,Clash,face,,,,critical\n"
           "air_x,airport,Bad Category,X,,,,,info\n"
           "ret_price_tag,retail,Compliance & Audit,Price tag missing,shelf,,,,info\n")
    assert client.post("/api/use-cases/import", headers={**env["h"], "Content-Type": "text/csv"}, content=csv).status_code == 403
    r = client.post("/api/use-cases/import", headers={**env["admin"], "Content-Type": "text/csv"}, content=csv).json()
    assert r["imported"] == 0 and [e["row"] for e in r["errors"]] == [2, 3]
    good = ("key,sector,category,name,capabilities,integrations,rule_type,classes,severity\n"
            "ret_price_tag,retail,Compliance & Audit,Price tag missing,shelf,,,,info\n"
            "log_reefer_door,logistics,Operations & Productivity,Reefer door open at dock,person_vehicle,,dwell,truck,warning\n")
    r = client.post("/api/use-cases/import", headers={**env["admin"], "Content-Type": "text/csv"}, content=good).json()
    assert r["imported"] == 2
    ucs = {u["key"]: u for u in client.get("/api/use-cases?sector=logistics", headers=env["h"]).json()}
    assert ucs["log_reefer_door"]["builtin"] is False and ucs["log_reefer_door"]["rule"]["type"] == "dwell"
    assert "key,sector,category" in client.get("/api/use-cases/import/template", headers=env["admin"]).text


def test_snapshot_not_available_for_simulated_camera(client, env):
    assert client.get(f"/api/cameras/{env['cam']['id']}/snapshot.jpg", headers=env["h"]).status_code == 404
