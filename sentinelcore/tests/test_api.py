import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from sentinel.db import SessionLocal
from sentinel.health import collector
from sentinel.main import app
from sentinel.models import Alert, DeviceState


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def login(client, u, p):
    r = client.post("/api/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def admin(client):
    return login(client, "admin", "Admin@123456")


@pytest.fixture(scope="module")
def fleet(client, admin):
    s1 = client.post("/api/sites", json={"name": "API North"}, headers=admin).json()
    s2 = client.post("/api/sites", json={"name": "API South"}, headers=admin).json()
    nvr = client.post("/api/nvrs", headers=admin, json={"name": "North NVR", "site_id": s1["id"], "vendor": "hikvision",
                                                        "host": "10.9.0.10", "channels": 4, "driver": "simulator"}).json()
    r = client.post(f"/api/nvrs/{nvr['id']}/import-channels", headers=admin, json={"driver": "simulator"})
    assert r.json()["created"] == 4
    south = client.post("/api/cameras", headers=admin, json={"name": "South Gate", "site_id": s2["id"],
                        "rtsp_url": "rtsp://10.9.1.5/s", "power_type": "solar", "driver": "simulator", "password": "x"}).json()
    for name, role, sites in (("op_north", "operator", [s1["id"]]), ("view_south", "viewer", [s2["id"]]),
                              ("audit1", "auditor", [])):
        r = client.post("/api/users", headers=admin, json={"username": name, "role": role, "site_ids": sites,
                                                           "password": "Passw0rd!!"})
        assert r.status_code == 201, r.text
    return {"s1": s1, "s2": s2, "nvr": nvr, "south": south}


def test_login_failures_and_lockout(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 429


def test_requires_auth(client):
    client.cookies.clear()
    assert client.get("/api/cameras").status_code == 401
    assert client.get("/api/cameras", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_password_never_returned(client, admin, fleet):
    cam = client.get(f"/api/cameras/{fleet['south']['id']}", headers=admin).json()
    assert cam["has_password"] is True and "password" not in cam and "password_enc" not in cam


def test_site_scoping(client, fleet):
    op = login(client, "op_north", "Passw0rd!!")
    names = {c["name"] for c in client.get("/api/cameras", headers=op).json()}
    assert len(names) == 4 and "South Gate" not in names
    assert client.get(f"/api/cameras/{fleet['south']['id']}", headers=op).status_code == 404
    assert [s["name"] for s in client.get("/api/sites", headers=op).json()] == ["API North"]
    viewer = login(client, "view_south", "Passw0rd!!")
    assert [c["name"] for c in client.get("/api/cameras", headers=viewer).json()] == ["South Gate"]


def test_role_permissions(client, fleet):
    viewer = login(client, "view_south", "Passw0rd!!")
    body = {"name": "X", "site_id": fleet["s2"]["id"], "rtsp_url": "rtsp://1.2.3.4/"}
    assert client.post("/api/cameras", headers=viewer, json=body).status_code == 403
    assert client.get("/api/users", headers=viewer).status_code == 403
    assert client.get("/api/audit", headers=viewer).status_code == 403
    auditor = login(client, "audit1", "Passw0rd!!")
    assert client.get("/api/audit", headers=auditor).status_code == 200
    assert client.post("/api/alert-rules", headers=auditor, json={}).status_code in (403, 422)


def test_camera_validation(client, admin, fleet):
    base = {"name": "Bad", "site_id": fleet["s1"]["id"]}
    assert client.post("/api/cameras", headers=admin, json={**base, "rtsp_url": "http://x"}).status_code == 422
    assert client.post("/api/cameras", headers=admin, json=base).status_code == 422
    assert client.post("/api/cameras", headers=admin, json={**base, "host": "1.1.1.1", "nvr_id": fleet["nvr"]["id"],
                                                            "site_id": fleet["s2"]["id"]}).status_code == 422
    r = client.put(f"/api/cameras/{fleet['south']['id']}/analytics", headers=admin, json=[{"type": "zone_intrusion", "polygon": [[0, 0]]}])
    assert r.status_code == 422
    ok = [{"type": "zone_intrusion", "polygon": [[0, 0], [1, 0], [1, 1]]}]
    assert client.put(f"/api/cameras/{fleet['south']['id']}/analytics", headers=admin, json=ok).status_code == 200


def test_collector_health_summary_and_alerts(client, admin, fleet):
    with SessionLocal() as db:
        res = collector.collect_once(db)
        assert res["cameras"] >= 5 and res["nvrs"] >= 1
        assert db.get(DeviceState, ("camera", fleet["south"]["id"])) is not None
    s = client.get("/api/health/summary", headers=admin).json()
    assert s["simulated"] is True
    assert s["cameras"]["total"] >= 5
    assert s["cameras"]["online"] + s["cameras"]["offline"] + s["cameras"]["unknown"] == s["cameras"]["total"]
    south = client.get(f"/api/cameras/{fleet['south']['id']}", headers=admin).json()
    if south["health"]["online"]:
        assert 0 <= south["health"]["data"]["battery_pct"] <= 100 and "solar_w" in south["health"]["data"]
    # NVR detail exposes disks from the simulator
    n = client.get(f"/api/nvrs/{fleet['nvr']['id']}", headers=admin).json()
    assert n["camera_count"] == 4 and "disks" in n["health"]["data"]
    m = client.get(f"/api/metrics/camera/{fleet['south']['id']}?keys=online,battery_pct", headers=admin).json()
    assert len(m["online"]) >= 1
    assert isinstance(client.get("/api/health/trend", headers=admin).json(), list)


def test_alert_ack_flow_and_scope(client, admin, fleet):
    with SessionLocal() as db:
        a = Alert(device_type="camera", device_id=fleet["south"]["id"], site_id=fleet["s2"]["id"], severity="warning",
                  message="South Gate: test alert")
        db.add(a)
        db.commit()
        aid = a.id
    op = login(client, "op_north", "Passw0rd!!")
    assert client.post(f"/api/alerts/{aid}/ack", headers=op).status_code == 404  # other site
    viewer = login(client, "view_south", "Passw0rd!!")
    assert client.post(f"/api/alerts/{aid}/ack", headers=viewer).status_code == 403  # no ack permission
    r = client.post(f"/api/alerts/{aid}/ack", headers=admin)
    assert r.json()["status"] == "acknowledged" and r.json()["acknowledged_by"] == "admin"


def test_edge_ingest_and_event_handling(client, admin, fleet):
    r = client.post("/api/edge-devices", headers=admin, json={"name": "jetson-south", "site_id": fleet["s2"]["id"]})
    key = r.json()["api_key"]
    ev = {"camera_id": fleet["south"]["id"], "type": "zone_intrusion", "object_class": "person", "confidence": 0.91}
    assert client.post("/api/edge/events", json=ev, headers={"X-Edge-Key": "sc_bad_key"}).status_code == 401
    assert client.post("/api/edge/events", json={**ev, "camera_id": 1}, headers={"X-Edge-Key": key}).status_code == 404
    r = client.post("/api/edge/events", json=ev, headers={"X-Edge-Key": key})
    assert r.status_code == 201
    eid = r.json()["id"]
    events = client.get("/api/events?status=new", headers=admin).json()
    assert any(e["id"] == eid and e["source"] == "edge" for e in events)
    r = client.post(f"/api/events/{eid}/handle", headers=admin, json={"status": "false_alarm", "notes": "shadow"})
    assert r.json()["status"] == "false_alarm"
    stats = client.get("/api/events/stats", headers=admin).json()
    assert stats["by_type"]["zone_intrusion"]["false_alarm"] >= 1 and stats["false_alarm_pct"] is not None


def test_csv_import_endpoint(client, admin, fleet):
    csv = "name,site,rtsp_url\nLobby,API South,rtsp://10.9.1.9/s\n"
    r = client.post("/api/cameras/import?dry_run=true", headers={**admin, "Content-Type": "text/csv"}, content=csv)
    assert r.json()["valid_rows"] == 1
    r = client.post("/api/cameras/import", headers={**admin, "Content-Type": "text/csv"}, content=csv)
    assert r.json()["imported"] == 1
    assert "name,site,host" in client.get("/api/cameras/import/template", headers=admin).text
    assert "South Gate" in client.get("/api/cameras/export.csv", headers=admin).text


def test_admin_cannot_demote_self_and_audit_logged(client, admin):
    me = client.get("/api/auth/me", headers=admin).json()
    r = client.patch(f"/api/users/{me['id']}", headers=admin, json={"username": "admin", "role": "viewer"})
    assert r.status_code == 422
    actions = {a["action"] for a in client.get("/api/audit", headers=admin).json()}
    assert {"login", "login_failed", "camera_created", "nvr_channels_imported", "alert_acknowledged",
            "event_handled", "edge_device_created"} <= actions


def test_ui_served_with_csp(client):
    r = client.get("/")
    assert r.status_code == 200 and "SentinelCore" in r.text
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert client.get("/static/app.js").status_code == 200
