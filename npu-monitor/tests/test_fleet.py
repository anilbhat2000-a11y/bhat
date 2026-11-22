import threading
import time

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient

from npu_monitor.server import _authorised, create_app


def test_token_rules(monkeypatch):
    monkeypatch.delenv("NPU_MONITOR_TOKEN", raising=False)
    assert not _authorised("127.0.0.1", None, None)          # no token configured -> never machine-authorised
    assert not _authorised("10.0.0.5", "anything", None)
    monkeypatch.setenv("NPU_MONITOR_TOKEN", "s3cret")
    assert _authorised("10.0.0.5", "s3cret", None) and not _authorised("10.0.0.5", "nope", None)


@pytest.fixture(scope="module")
def peer(tmp_path_factory):
    """A second NPU Monitor on a real port, standing in for another machine."""
    import os
    import npu_monitor.auth as auth
    auth.DATA_DIR = str(tmp_path_factory.mktemp("peerauth"))
    os.environ["NPU_MONITOR_TOKEN"] = "fleet-test-token"
    server = uvicorn.Server(uvicorn.Config(create_app(), host="127.0.0.1", port=8799, log_level="warning"))
    t = threading.Thread(target=server.run, daemon=True)
    t.start()
    for _ in range(100):
        try:
            httpx.get("http://127.0.0.1:8799/api/node", timeout=1)
            break
        except Exception:
            time.sleep(0.2)
    yield "127.0.0.1:8799"
    server.should_exit = True
    t.join(5)


def test_hub_adds_peer_and_runs_everyone(peer, tmp_path, monkeypatch):
    import npu_monitor.fleet as fleet_mod
    import npu_monitor.jobs as jobs
    monkeypatch.setattr(fleet_mod, "DATA_DIR", str(tmp_path))
    monkeypatch.setattr(jobs, "REPORTS_DIR", str(tmp_path / "reports"))
    import npu_monitor.auth as auth
    monkeypatch.setattr(auth, "DATA_DIR", str(tmp_path / "hubauth"))
    with TestClient(create_app()) as hub:
        assert hub.post("/api/auth/setup", json={"username": "admin", "password": "Adm1n-pass-123"}).status_code == 200
        time.sleep(1)
        r = hub.post("/api/fleet/peers", json={"url": peer, "token": "fleet-test-token", "name": "peer-laptop"})
        assert r.status_code == 200, r.text
        assert "token" not in r.json()
        status = hub.get("/api/fleet").json()
        assert len(status) == 2 and all(m["online"] for m in status)
        assert status[1]["node"]["ai_pc"]["class"]
        run_id = hub.post("/api/fleet/run", json={"seconds": 3}).json()["id"]
        for _ in range(240):
            run = hub.get(f"/api/fleet/runs/{run_id}").json()
            if run["status"] == "done":
                break
            time.sleep(0.5)
        assert run["status"] == "done", run
        assert [m["status"] for m in run["machines"]] == ["done", "done"]
        assert len(run["comparison"]["ranking"]) == 2 and run["comparison"]["why_best"]


def test_fleet_token_is_limited_to_hub_routes(peer):
    h = {"X-NPU-Token": "fleet-test-token"}
    assert httpx.get(f"http://{peer}/api/node", headers=h).status_code == 200
    assert httpx.get(f"http://{peer}/api/users", headers=h).status_code == 403     # no admin via machine token
    assert httpx.get(f"http://{peer}/api/node").status_code == 401                # nothing without token or login
    assert httpx.get(f"http://{peer}/api/node", headers={"X-NPU-Token": "wrong"}).status_code == 401
