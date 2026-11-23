import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from sentinel import notify
from sentinel.config import settings
from sentinel.db import SessionLocal
from sentinel.health import collector
from sentinel.main import app
from sentinel.models import NVR, Alert, Camera, DeviceState, NotificationLog

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
def admin(client):
    return login(client, "admin", "Admin@123456")


def mk_loc(client, h, name, parent, kind="branch", **kw):
    r = client.post("/api/locations", headers=h, json={"name": name, "parent_id": parent, "kind": kind, **kw})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def mk_user(client, h, username, role, locs=(), org_id=None, designation=""):
    r = client.post("/api/users", headers=h, json={"username": username, "role": role, "location_ids": list(locs),
                                                   "password": PW, "org_id": org_id, "designation": designation})
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture(scope="module")
def world(client, admin):
    """Two organizations. Acme: Corporate > West Region > (Andheri Branch > 2nd Floor, Pune Warehouse).
    Acme requires approval for device changes."""
    acme = client.post("/api/orgs", headers=admin, json={"name": "Acme Test", "code": "ACMET", "require_approval": True}).json()
    other = client.post("/api/orgs", headers=admin, json={"name": "Other Co", "code": "OTHR"}).json()
    locs = {l["name"]: l["id"] for l in client.get(f"/api/locations?org_id={acme['id']}", headers=admin).json()}
    corp = locs["Corporate Office"]
    west = mk_loc(client, admin, "West Region", corp, "region")
    andheri = mk_loc(client, admin, "Andheri Branch", west, code="ACM-AND")
    floor2 = mk_loc(client, admin, "2nd Floor", andheri, "floor")
    pune = mk_loc(client, admin, "Pune Warehouse", west, "warehouse")
    other_hq = [l for l in client.get(f"/api/locations?org_id={other['id']}", headers=admin).json()][0]["id"]
    mk_user(client, admin, "acme_org", "org_admin", org_id=acme["id"])
    mk_user(client, admin, "west_mgr", "location_admin", [west], acme["id"], "Regional Manager")
    mk_user(client, admin, "andheri_adm", "location_admin", [andheri], acme["id"])
    mk_user(client, admin, "andheri_op", "operator", [andheri], acme["id"])
    mk_user(client, admin, "other_org", "org_admin", org_id=other["id"])
    org_h = login(client, "acme_org")
    nvr = client.post("/api/nvrs", headers=org_h, json={"name": "AND NVR", "location_id": andheri, "vendor": "hikvision",
                                                         "host": "10.9.0.10", "channels": 4, "driver": "simulator",
                                                         "department": "Security"})
    assert nvr.status_code == 201, nvr.text
    nvr = nvr.json()
    r = client.post(f"/api/nvrs/{nvr['id']}/import-channels", headers=org_h, json={"driver": "simulator"})
    assert r.json()["created"] == 4
    pune_cam = client.post("/api/cameras", headers=org_h, json={"name": "Pune Gate", "location_id": pune,
                           "rtsp_url": "rtsp://10.9.1.5/s", "power_type": "solar", "driver": "simulator",
                           "password": "x", "department": "Logistics"}).json()
    floor_cam = client.post("/api/cameras", headers=org_h, json={"name": "Floor2 Dome", "location_id": floor2,
                            "rtsp_url": "rtsp://10.9.1.6/s", "driver": "simulator"}).json()
    other_cam = client.post("/api/cameras", headers=admin, json={"name": "Other Lobby", "location_id": other_hq,
                            "rtsp_url": "rtsp://10.8.1.6/s", "driver": "simulator"}).json()
    return {"acme": acme, "other": other, "corp": corp, "west": west, "andheri": andheri, "floor2": floor2,
            "pune": pune, "other_hq": other_hq, "nvr": nvr, "pune_cam": pune_cam, "floor_cam": floor_cam,
            "other_cam": other_cam}


def names(client, h, path="/api/cameras"):
    return {c["name"] for c in client.get(path, headers=h).json()}


def test_login_failures_and_lockout(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 429


def test_requires_auth(client):
    client.cookies.clear()
    assert client.get("/api/cameras").status_code == 401
    assert client.get("/api/cameras", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_org_isolation(client, world):
    other = login(client, "other_org")
    assert names(client, other) == {"Other Lobby"}
    assert client.get(f"/api/cameras/{world['pune_cam']['id']}", headers=other).status_code == 404
    assert [o["code"] for o in client.get("/api/orgs", headers=other).json()] == ["OTHR"]
    acme = login(client, "acme_org")
    assert "Other Lobby" not in names(client, acme)
    # cannot attach a location to another org's tree
    r = client.post("/api/locations", headers=acme, json={"name": "Sneaky", "parent_id": world["other_hq"]})
    assert r.status_code == 404


def test_hierarchy_scoping(client, world):
    west = login(client, "west_mgr")
    assert names(client, west) == {"AND NVR CH01", "AND NVR CH02", "AND NVR CH03", "AND NVR CH04", "Pune Gate", "Floor2 Dome"}
    andheri = login(client, "andheri_adm")
    assert "Pune Gate" not in names(client, andheri) and "Floor2 Dome" in names(client, andheri)  # sub-location included
    op = login(client, "andheri_op")
    assert client.get(f"/api/cameras/{world['pune_cam']['id']}", headers=op).status_code == 404
    paths = {l["path"] for l in client.get("/api/locations", headers=andheri).json()}
    assert paths == {"Corporate Office / West Region / Andheri Branch", "Corporate Office / West Region / Andheri Branch / 2nd Floor"}
    # location filter covers the subtree
    assert names(client, west, f"/api/cameras?location_id={world['andheri']}") >= {"Floor2 Dome", "AND NVR CH01"}
    cam = client.get(f"/api/cameras/{world['floor_cam']['id']}", headers=west).json()
    assert cam["location_path"].endswith("Andheri Branch / 2nd Floor") and cam["org"] == "Acme Test"


def test_role_ladder_for_user_management(client, world):
    andheri = login(client, "andheri_adm")
    # cannot create a peer or higher role, nor assign locations outside own subtree
    r = client.post("/api/users", headers=andheri, json={"username": "xx1", "role": "location_admin",
                                                          "location_ids": [world["andheri"]], "password": PW})
    assert r.status_code == 403
    r = client.post("/api/users", headers=andheri, json={"username": "xx2", "role": "operator",
                                                          "location_ids": [world["pune"]], "password": PW})
    assert r.status_code == 404
    r = client.post("/api/users", headers=andheri, json={"username": "floor_viewer", "role": "viewer",
                                                          "location_ids": [world["floor2"]], "password": PW})
    assert r.status_code == 201 and r.json()["org"] == "Acme Test"
    visible = {u["username"] for u in client.get("/api/users", headers=andheri).json()}
    assert "floor_viewer" in visible and "west_mgr" not in visible and "acme_org" not in visible
    me = client.get("/api/auth/me", headers=andheri).json()
    assert client.patch(f"/api/users/{me['id']}", headers=andheri,
                        json={"username": "andheri_adm", "role": "org_admin"}).status_code == 422


def test_location_management(client, world):
    andheri = login(client, "andheri_adm")
    room = mk_loc(client, andheri, "Server Room", world["floor2"], "area")
    assert client.post("/api/locations", headers=andheri, json={"name": "Server Room", "parent_id": world["floor2"],
                                                               "kind": "area"}).status_code == 409
    assert client.patch(f"/api/locations/{world['floor2']}", headers=andheri,
                        json={"name": "2nd Floor", "kind": "floor", "parent_id": room}).status_code == 422  # cycle
    assert client.delete(f"/api/locations/{world['andheri']}", headers=andheri).status_code == 403  # own node
    assert client.delete(f"/api/locations/{world['floor2']}", headers=andheri).status_code == 409  # has children
    assert client.delete(f"/api/locations/{room}", headers=andheri).status_code == 200
    op = login(client, "andheri_op")
    assert client.post("/api/locations", headers=op, json={"name": "X", "parent_id": world["andheri"]}).status_code == 403


def test_approval_workflow(client, world):
    andheri = login(client, "andheri_adm")
    body = {"name": "New Entry Cam", "location_id": world["andheri"], "rtsp_url": "rtsp://10.9.2.1/s", "driver": "simulator"}
    r = client.post("/api/cameras", headers=andheri, json=body)
    assert r.status_code == 202 and r.json()["pending_approval"]
    rid = r.json()["request_id"]
    assert "New Entry Cam" not in names(client, andheri)
    # requester and peers cannot approve; operator cannot
    assert client.post(f"/api/approvals/{rid}/decide", headers=andheri, json={"approve": True}).status_code == 403
    assert client.post(f"/api/approvals/{rid}/decide", headers=login(client, "andheri_op"), json={"approve": True}).status_code == 403
    west = login(client, "west_mgr")
    pend = client.get("/api/approvals", headers=west).json()
    assert any(p["id"] == rid and p["can_decide"] for p in pend)
    r = client.post(f"/api/approvals/{rid}/decide", headers=west, json={"approve": True, "note": "ok"})
    assert r.json()["status"] == "approved"
    assert "New Entry Cam" in names(client, andheri)
    # second request is rejected by the org admin; west manager's own change needs approval from above
    r = client.post("/api/cameras", headers=west, json={**body, "name": "West Cam", "location_id": world["pune"]})
    rid2 = r.json()["request_id"]
    assert client.post(f"/api/approvals/{rid2}/decide", headers=andheri, json={"approve": True}).status_code == 403
    r = client.post(f"/api/approvals/{rid2}/decide", headers=login(client, "acme_org"), json={"approve": False, "note": "dup"})
    assert r.json()["status"] == "rejected" and "West Cam" not in names(client, west)
    # org without approval applies location admin changes directly
    other = login(client, "other_org")
    r = client.post("/api/cameras", headers=other, json={**body, "name": "Direct", "location_id": world["other_hq"]})
    assert r.status_code == 201


def test_identity_status_reboot_troubleshoot(client, admin, world):
    with SessionLocal() as db:
        collector.collect_once(db)
    org_h = login(client, "acme_org")
    cam = client.get(f"/api/cameras/{world['pune_cam']['id']}", headers=org_h).json()
    if cam["health"]["online"]:
        assert cam["serial_number"].startswith("SIM") and cam["manufacturer"] and cam["firmware"]
    assert cam["department"] == "Logistics"
    nvr = client.get(f"/api/nvrs/{world['nvr']['id']}", headers=org_h).json()
    assert nvr["department"] == "Security" and nvr["serial_number"].startswith("SIM")
    # reboot (simulated) takes the NVR offline; operator may not reboot
    assert client.post(f"/api/nvrs/{world['nvr']['id']}/reboot", headers=login(client, "andheri_op")).status_code == 403
    r = client.post(f"/api/nvrs/{world['nvr']['id']}/reboot", headers=org_h)
    assert r.status_code == 200 and r.json()["method"] == "simulator"
    r = client.post(f"/api/nvrs/{world['nvr']['id']}/troubleshoot", headers=org_h).json()
    assert r["steps"][0]["status"] == "fail"
    assert client.get(f"/api/nvrs/{world['nvr']['id']}", headers=org_h).json()["health"]["error"].startswith("simulated")
    # deactivate (org admin applies directly) closes open alerts and stops polling
    with SessionLocal() as db:
        db.add(Alert(device_type="camera", device_id=world["floor_cam"]["id"], location_id=world["floor2"],
                     severity="warning", message="x"))
        db.commit()
    r = client.post(f"/api/cameras/{world['floor_cam']['id']}/enabled", headers=org_h, json={"enabled": False})
    assert r.status_code == 200
    with SessionLocal() as db:
        assert db.get(Camera, world["floor_cam"]["id"]).enabled is False
        assert db.scalar(select(Alert).where(Alert.device_id == world["floor_cam"]["id"], Alert.message == "x")).status == "resolved"
    # location admin's deactivate goes to approval in Acme
    r = client.post(f"/api/cameras/{world['pune_cam']['id']}/enabled", headers=login(client, "west_mgr"), json={"enabled": False})
    assert r.status_code == 202


def test_troubleshoot_real_driver_reports_network_failure(client, world):
    org_h = login(client, "acme_org")
    cam = client.post("/api/cameras", headers=org_h, json={"name": "Unreachable", "location_id": world["pune"],
                      "rtsp_url": "rtsp://127.0.0.1:1/x", "driver": "rtsp"}).json()
    r = client.post(f"/api/cameras/{cam['id']}/troubleshoot", headers=org_h).json()
    net = [s for s in r["steps"] if s["name"].startswith("Network")][0]
    assert r["result"] == "fail" and net["status"] == "fail" and net["hint"]
    c = client.get(f"/api/cameras/{cam['id']}", headers=org_h).json()
    assert c["health"]["status"] == "offline" and c["health"]["error"]


def test_contacts_validation_and_scope(client, world):
    andheri = login(client, "andheri_adm")
    base = {"location_id": world["andheri"], "name": "Vikram", "designation": "Security Supervisor"}
    assert client.post("/api/contacts", headers=andheri, json={**base, "phone": "12ab"}).status_code == 422
    assert client.post("/api/contacts", headers=andheri, json={**base, "email": "bad"}).status_code == 422
    assert client.post("/api/contacts", headers=andheri, json={**base, "notify_sms": True, "email": "v@x.in"}).status_code == 422
    assert client.post("/api/contacts", headers=andheri, json={**base, "location_id": world["pune"],
                                                              "email": "v@x.in"}).status_code == 404
    r = client.post("/api/contacts", headers=andheri, json={**base, "phone": "+91 98000-00001", "email": "v@x.in",
                                                           "notify_sms": True})
    assert r.status_code == 201 and r.json()["phone"] == "+919800000001"
    assert client.post("/api/contacts", headers=login(client, "andheri_op"), json={**base, "email": "a@b.co"}).status_code == 403


def test_notifications_routing_and_escalation(client, world, monkeypatch):
    org_h = login(client, "acme_org")
    west_contact = client.post("/api/contacts", headers=org_h, json={
        "location_id": world["west"], "name": "Rahul", "designation": "Regional Manager", "email": "r@acme.in",
        "phone": "+919800000002", "notify_sms": True, "min_severity": "critical", "escalation_delay_min": 30}).json()
    corp_contact = client.post("/api/contacts", headers=org_h, json={
        "location_id": world["corp"], "name": "Priya", "designation": "Head of Security", "email": "p@acme.in",
        "min_severity": "warning"}).json()
    other_contact = client.post("/api/contacts", headers=login(client, "other_org"), json={
        "location_id": world["other_hq"], "name": "Zed", "email": "z@other.in"}).json()
    sent = []
    monkeypatch.setattr(notify, "send_email", lambda to, subj, body: sent.append(("email", to, subj)))
    monkeypatch.setattr(notify, "send_sms", lambda phone, text, client=None: sent.append(("sms", phone, text)))
    from datetime import timedelta
    from sentinel.models import utcnow
    with SessionLocal() as db:
        cam = db.get(Camera, world["floor_cam"]["id"])
        crit = Alert(device_type="camera", device_id=cam.id, location_id=world["floor2"], severity="critical",
                     message="Floor2 Dome: offline", opened_at=utcnow())
        db.add(crit)
        db.commit()
        notify.dispatch(db)
        targets = {(c, t) for c, t, _ in sent}
        assert ("email", "p@acme.in") in targets            # corporate contact covers the whole tree
        assert ("email", "z@other.in") not in targets       # other organization never notified
        assert ("email", "r@acme.in") not in targets        # escalation not due yet
        n_before = len(sent)
        notify.dispatch(db)
        assert len(sent) == n_before                        # never sent twice
        crit = db.get(Alert, crit.id)
        crit.opened_at = utcnow() - timedelta(minutes=31)
        db.commit()
        notify.dispatch(db)
        esc = [s for s in sent[n_before:]]
        assert {(c, t) for c, t, _ in esc} == {("email", "r@acme.in"), ("sms", "+919800000002")}
        assert esc[0][2].startswith("[ESCALATION]") or esc[0][0] == "sms"
        logged = db.scalars(select(NotificationLog).where(NotificationLog.alert_id == crit.id)).all()
        assert {r.status for r in logged} == {"sent"}
        assert {r.target for r in logged} >= {"p@acme.in", "r@acme.in", "+919800000002"}
    log = client.get("/api/notifications", headers=login(client, "west_mgr")).json()
    assert any(r["contact"] == "Rahul" and r["designation"] == "Regional Manager" for r in log)
    assert not any(r["target"] == "z@other.in" for r in log)
    assert other_contact["id"] and west_contact["id"] and corp_contact["id"]


def test_notification_channels_not_configured_are_logged_as_skipped(client, world):
    org_h = login(client, "acme_org")
    c = client.post("/api/contacts", headers=org_h, json={"location_id": world["pune"], "name": "T", "email": "t@acme.in"}).json()
    assert settings.smtp_host == ""
    r = client.post(f"/api/contacts/{c['id']}/test", headers=org_h).json()
    assert r["results"][0]["status"] == "skipped" and "SC_SMTP_HOST" in r["results"][0]["error"]


def test_sms_gateway_request_building(monkeypatch):
    import httpx
    monkeypatch.setattr(settings, "sms_url", "https://sms.local/send?to={phone}")
    monkeypatch.setattr(settings, "sms_body", '{"mobile": "{phone}", "msg": "{message}"}')
    monkeypatch.setattr(settings, "sms_headers", '{"authkey": "k"}')
    seen = {}

    def handler(req):
        seen["url"], seen["body"], seen["key"] = str(req.url), req.content.decode(), req.headers["authkey"]
        return httpx.Response(200)
    notify.send_sms("+919800000001", 'Alert "A" @ Andheri', httpx.Client(transport=httpx.MockTransport(handler)))
    assert seen["url"] == "https://sms.local/send?to=%2B919800000001" and seen["key"] == "k"
    assert seen["body"] == '{"mobile": "+919800000001", "msg": "Alert \\"A\\" @ Andheri"}'


def test_alert_ack_scope(client, admin, world):
    with SessionLocal() as db:
        a = Alert(device_type="camera", device_id=world["pune_cam"]["id"], location_id=world["pune"], severity="warning",
                  message="Pune Gate: test alert")
        db.add(a)
        db.commit()
        aid = a.id
    assert client.post(f"/api/alerts/{aid}/ack", headers=login(client, "andheri_op")).status_code == 404
    r = client.post(f"/api/alerts/{aid}/ack", headers=login(client, "west_mgr"))
    assert r.json()["status"] == "acknowledged" and r.json()["acknowledged_by"] == "west_mgr"


def test_edge_ingest_within_subtree(client, admin, world):
    org_h = login(client, "acme_org")
    key = client.post("/api/edge-devices", headers=org_h, json={"name": "jetson-west", "location_id": world["west"]}).json()["api_key"]
    ok = {"camera_id": world["floor_cam"]["id"], "type": "zone_intrusion", "confidence": 0.9}
    assert client.post("/api/edge/events", json=ok, headers={"X-Edge-Key": key}).status_code == 201
    bad = {**ok, "camera_id": world["other_cam"]["id"]}
    assert client.post("/api/edge/events", json=bad, headers={"X-Edge-Key": key}).status_code == 404
    assert client.post("/api/edge/events", json=ok, headers={"X-Edge-Key": "sc_bad_key"}).status_code == 401


def test_csv_import_by_path_and_code(client, world):
    org_h = login(client, "acme_org")
    csv = ("name,location,rtsp_url,driver\n"
           "Lobby CSV,acm-and,rtsp://10.9.1.9/s,simulator\n"
           "Floor CSV,Corporate Office / West Region / Andheri Branch / 2nd Floor,rtsp://10.9.1.10/s,simulator\n")
    r = client.post("/api/cameras/import?dry_run=true", headers={**org_h, "Content-Type": "text/csv"}, content=csv)
    assert r.json()["valid_rows"] == 2, r.text
    r = client.post("/api/cameras/import", headers={**org_h, "Content-Type": "text/csv"}, content=csv)
    assert r.json()["imported"] == 2
    other = login(client, "other_org")
    r = client.post("/api/cameras/import?dry_run=true", headers={**other, "Content-Type": "text/csv"}, content=csv)
    assert len(r.json()["errors"]) == 2  # Acme locations are invisible to another org
    assert "location" in client.get("/api/cameras/import/template", headers=org_h).text


def test_health_summary_groups_by_branch(client, world):
    with SessionLocal() as db:
        collector.collect_once(db)
    s = client.get("/api/health/summary", headers=login(client, "west_mgr")).json()
    groups = {g["name"] for g in s["locations"]}
    assert "Corporate Office / West Region / Andheri Branch" in groups  # 2nd Floor rolls up to its branch
    assert all("Other" not in g for g in groups)
    s2 = client.get(f"/api/health/summary?location_id={world['pune']}", headers=login(client, "west_mgr")).json()
    assert s2["cameras"]["total"] < s["cameras"]["total"]


def test_audit_scoped_to_org(client, admin, world):
    acme_audit = client.get("/api/audit?limit=2000", headers=login(client, "acme_org")).json()
    acme_auditor = mk_user(client, admin, "acme_aud", "auditor", org_id=world["acme"]["id"])
    assert acme_auditor["org"] == "Acme Test"
    rows = client.get("/api/audit", headers=login(client, "acme_aud")).json()
    assert rows and all(r["org_id"] == world["acme"]["id"] for r in rows)
    assert {"change_requested", "change_approved", "change_rejected", "nvr_reboot"} <= {r["action"] for r in acme_audit} | {r["action"] for r in rows}
    platform = {r["action"] for r in client.get("/api/audit", headers=admin).json()}
    assert "org_created" in platform


def test_ui_served_with_csp(client):
    r = client.get("/")
    assert r.status_code == 200 and "3C ITS" in r.text and "VisionOps" in r.text
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert client.get("/static/app.js").status_code == 200


def test_ui_files_are_revalidated_so_updates_show(client):
    assert client.get("/").headers["cache-control"] == "no-cache"
    assert client.get("/static/app.js").headers["cache-control"] == "no-cache"
