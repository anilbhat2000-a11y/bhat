import time

import pytest
from fastapi.testclient import TestClient

from npu_monitor.auth import AuthError, AuthStore, hash_password, required_role, verify_password
from npu_monitor.server import create_app

PW = "Adm1n-pass-123"


def test_password_hashing():
    h = hash_password("S3cret-pass")
    assert h.startswith("pbkdf2_sha256$310000$") and verify_password("S3cret-pass", h)
    assert not verify_password("wrong", h) and not verify_password("x", "garbage")


def test_roles_map():
    assert required_role("POST", "/api/assessment") == "operator"
    assert required_role("GET", "/api/reports") == "viewer"
    assert required_role("POST", "/api/fleet/peers") == "admin"
    assert required_role("GET", "/api/users") == "admin"


def test_store_rules(tmp_path):
    s = AuthStore(str(tmp_path))
    s.create_user("admin", PW, "admin")
    with pytest.raises(AuthError):
        s.create_user("weak", "short", "viewer")
    with pytest.raises(AuthError):
        s.create_user("ADMIN", PW, "viewer")                     # case-insensitive duplicate
    with pytest.raises(AuthError):
        s.update_user("admin", "admin", role="viewer")            # last admin / own role
    with pytest.raises(AuthError):
        s.delete_user("admin", "admin")
    s.create_user("bob", PW, "viewer")
    tok, _ = s.login("bob", PW, "1.2.3.4")
    assert s.session_user(tok)["username"] == "bob"
    s.update_user("bob", "admin", password="N3w-temp-pass")      # admin reset ends bob's sessions
    assert s.session_user(tok) is None and s.users["bob"]["must_change_password"]
    assert "password" not in s.public(s.users["bob"])


def test_lockout(tmp_path):
    s = AuthStore(str(tmp_path))
    s.create_user("eve", PW, "viewer")
    for _ in range(5):
        with pytest.raises(AuthError):
            s.login("eve", "nope-nope-1", "9.9.9.9")
    with pytest.raises(AuthError) as e:
        s.login("eve", PW, "9.9.9.9")                            # correct password, but locked
    assert e.value.status == 429


@pytest.fixture()
def app_client(tmp_path, monkeypatch):
    import npu_monitor.auth as auth
    monkeypatch.setattr(auth, "DATA_DIR", str(tmp_path))
    with TestClient(create_app()) as c:
        yield c


def test_login_flow_and_roles(app_client):
    c = app_client
    assert c.get("/api/auth/status").json()["setup_required"] is True
    assert c.get("/api/metrics").status_code == 401
    r = c.get("/", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/login"
    assert c.get("/login").status_code == 200
    r = c.post("/api/auth/setup", json={"username": "admin", "password": PW})
    assert r.status_code == 200
    cookie = r.headers["set-cookie"].lower()
    assert "npu_session=" in cookie and "httponly" in cookie and "samesite=strict" in cookie
    assert c.post("/api/auth/setup", json={"username": "x", "password": PW}).status_code == 409
    assert c.get("/api/metrics").status_code == 200 and c.get("/admin").status_code == 200

    # admin creates a viewer; the viewer must change the temporary password first
    assert c.post("/api/users", json={"username": "vera", "password": "Temp-pass-001", "role": "viewer"}).status_code == 200
    c.post("/api/auth/logout")
    assert c.get("/api/metrics").status_code == 401
    assert c.post("/api/auth/login", json={"username": "vera", "password": "bad"}).status_code == 401
    assert c.post("/api/auth/login", json={"username": "vera", "password": "Temp-pass-001"}).status_code == 200
    assert c.get("/api/metrics").json()["detail"] == "password change required"
    assert c.post("/api/auth/password", json={"current": "Temp-pass-001", "new": "Vera-own-pass-9"}).status_code == 200
    assert c.get("/api/metrics").status_code == 200
    assert c.post("/api/assessment", json={"seconds": 3}).status_code == 403   # viewer can't run jobs
    assert c.get("/api/users").status_code == 403
    assert c.get("/admin", follow_redirects=False).status_code == 303

    c.post("/api/auth/logout")
    c.post("/api/auth/login", json={"username": "admin", "password": PW})
    assert c.patch("/api/users/vera", json={"role": "operator"}).status_code == 200
    assert c.patch("/api/users/admin", json={"role": "viewer"}).status_code == 400
    assert c.put("/api/security", json={"session_minutes": 2}).status_code == 400
    assert c.put("/api/security", json={"session_minutes": 60}).json()["session_minutes"] == 60
    actions = [a["action"] for a in c.get("/api/audit").json()]
    assert {"setup", "user_created", "login_failed", "password_changed", "user_updated", "security_updated"} <= set(actions)
    assert c.delete("/api/users/vera").status_code == 200
