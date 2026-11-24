import re
import time

import pytest
from fastapi.testclient import TestClient

from npu_monitor.server import create_app

PW = "Adm1n-pass-123"


@pytest.fixture()
def env(tmp_path, monkeypatch):
    import npu_monitor.auth as auth
    import npu_monitor.mailer as mailer
    monkeypatch.setattr(auth, "DATA_DIR", str(tmp_path))
    sent = []
    monkeypatch.setattr(mailer, "send", lambda smtp, to, subject, text, html=None, timeout=15: sent.append(
        {"smtp": smtp, "to": to, "subject": subject, "text": text, "html": html}))
    with TestClient(create_app()) as admin:
        assert admin.post("/api/auth/setup", json={"username": "admin", "password": PW}).status_code == 200
        anon = TestClient(admin.app)
        yield admin, anon, sent


def wait_for(sent, n):
    for _ in range(50):
        if len(sent) >= n:
            return
        time.sleep(0.05)
    raise AssertionError(f"expected {n} emails, got {len(sent)}")


def test_forgot_without_email_goes_to_admins(env):
    admin, anon, sent = env
    assert admin.post("/api/users", json={"username": "priya", "password": "Temp-pass-001", "role": "viewer"}).status_code == 200
    r1 = anon.post("/api/auth/forgot", json={"username": "PRIYA", "note": "front desk <b>ext 214</b>"})
    r2 = anon.post("/api/auth/forgot", json={"username": "nobody-here"})
    assert r1.status_code == r2.status_code == 200 and r1.json() == r2.json()          # no account enumeration
    reqs = admin.get("/api/users/requests").json()
    assert len(reqs) == 1 and reqs[0]["user"] == "priya" and "ext 214" in reqs[0]["note"]
    anon.post("/api/auth/forgot", json={"username": "priya"})
    assert len(admin.get("/api/users/requests").json()) == 1                              # de-duplicated
    assert admin.get("/api/auth/me").json()["pending_resets"] == 1
    assert admin.patch("/api/users/priya", json={"password": "Fresh-temp-002"}).status_code == 200
    assert admin.get("/api/users/requests").json() == []                                   # resolved by the reset
    assert sent == []
    assert anon.get("/api/users/requests").status_code == 401


def test_forgot_with_email_link_flow(env):
    admin, anon, sent = env
    r = admin.put("/api/security", json={"portal_url": "http://192.168.1.205:8765",
                                         "smtp": {"host": "mail.local", "port": 587, "security": "starttls",
                                                  "username": "portal", "password": "smtp-secret", "from_addr": "it@corp.local"}})
    assert r.status_code == 200 and r.json()["email_configured"] is True
    sec = admin.get("/api/security").json()
    assert "password" not in sec["smtp"] and sec["smtp"]["has_password"] is True          # never sent back
    assert admin.post("/api/users", json={"username": "ravi", "password": "Temp-pass-001", "role": "operator",
                                          "email": "ravi@corp.local"}).status_code == 200
    assert admin.post("/api/users", json={"username": "bad", "password": "Temp-pass-001", "email": "not-an-email"}).status_code == 400
    anon.post("/api/auth/forgot", json={"username": "ravi@corp.local"})                   # by email address
    wait_for(sent, 1)
    mail = sent[0]
    assert mail["to"] == "ravi@corp.local" and mail["smtp"]["password"] == "smtp-secret"
    token = re.search(r"/reset\?token=([\w-]+)", mail["text"]).group(1)
    assert mail["text"].count("http://192.168.1.205:8765/reset?token=") == 1
    assert anon.get(f"/api/auth/reset-check?token={token}").json() == {"valid": True, "username": "ravi", "min_password_length": 10}
    assert anon.post("/api/auth/reset", json={"token": token, "password": "short"}).status_code == 400
    assert anon.post("/api/auth/reset", json={"token": token, "password": "Ravi-new-pass-7"}).status_code == 200
    assert anon.post("/api/auth/reset", json={"token": token, "password": "Ravi-new-pass-8"}).status_code == 400  # single use
    assert anon.post("/api/auth/login", json={"username": "ravi", "password": "Ravi-new-pass-7"}).status_code == 200
    assert anon.get("/api/metrics").status_code == 200                                     # no forced change after link reset
    assert admin.get("/api/users/requests").json() == []                                   # email path queues nothing
    assert anon.get("/forgot").status_code == 200 and anon.get("/reset").status_code == 200


def test_admin_send_link_test_email_and_rate_limit(env):
    admin, anon, sent = env
    admin.put("/api/security", json={"smtp": {"host": "mail.local", "from_addr": "it@corp.local"}})
    admin.post("/api/users", json={"username": "noemail", "password": "Temp-pass-001"})
    admin.post("/api/users", json={"username": "lee", "password": "Temp-pass-001", "email": "lee@corp.local"})
    assert admin.post("/api/users/noemail/send-reset").status_code == 400
    r = admin.post("/api/users/lee/send-reset")
    assert r.status_code == 200 and r.json()["sent_to"] == "lee@corp.local"
    assert admin.post("/api/security/test-email", json={"to": "admin@corp.local"}).status_code == 200
    assert {m["to"] for m in sent} == {"lee@corp.local", "admin@corp.local"}
    codes = [anon.post("/api/auth/forgot", json={"username": f"x{i}"}).status_code for i in range(7)]
    assert codes[:5] == [200] * 5 and codes[-1] == 429
    actions = {a["action"] for a in admin.get("/api/audit").json()}
    assert {"password_reset_link_sent", "password_forgot_unknown", "test_email_sent"} <= actions
