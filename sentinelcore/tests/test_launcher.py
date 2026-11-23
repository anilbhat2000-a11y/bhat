import socket
import threading
import time

import pytest

from sentinel import launcher


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture
def home(tmp_path, monkeypatch):
    logs = tmp_path / "logs"
    monkeypatch.setattr(launcher, "ENV_FILE", tmp_path / "visionops.env")
    monkeypatch.setattr(launcher, "LOG_DIR", logs)
    monkeypatch.setattr(launcher, "STATE_FILE", logs / "launcher.json")
    monkeypatch.setattr(launcher, "OUT_LOG", logs / "server-output.log")
    monkeypatch.setattr(launcher, "APP_LOG", logs / "visionops.log")
    monkeypatch.setattr(launcher, "LAUNCH_LOG", logs / "launcher.log")
    monkeypatch.setenv("SC_DATABASE_URL", f"sqlite:///{tmp_path}/launch.db")
    monkeypatch.setenv("SC_COLLECTOR", "0")
    return tmp_path


def test_settings_file_created_once(home):
    assert launcher.ensure_env_file(db_exists=True) is True
    env = launcher.read_env()
    assert env["SC_SECRET_KEY"] == launcher.LEGACY_KEY      # existing database keeps its key
    assert env["SC_PORT"] == "8080" and env["SC_HOST"] == "127.0.0.1"
    assert launcher.ensure_env_file() is False              # never overwritten
    launcher.ENV_FILE.unlink()
    launcher.ensure_env_file(db_exists=False)
    assert len(launcher.read_env()["SC_SECRET_KEY"]) > 40 and launcher.read_env()["SC_SECRET_KEY"] != launcher.LEGACY_KEY


def test_check_reports_port_used_by_another_program(home):
    port = free_port()
    launcher.ensure_env_file(db_exists=False)
    launcher.ENV_FILE.write_text(launcher.ENV_FILE.read_text().replace("SC_PORT=8080", f"SC_PORT={port}"))
    with socket.socket() as blocker:
        blocker.bind(("127.0.0.1", port))
        blocker.listen(1)
        problems = launcher.check(fix=False)
    assert any(f"Port {port} is used by another program" in p for p in problems)
    assert launcher.check(fix=False) == []                   # all good once the port is free


def test_runs_restarts_after_crash_and_stops(home):
    port = free_port()
    launcher.ensure_env_file(db_exists=False)
    launcher.ENV_FILE.write_text(launcher.ENV_FILE.read_text().replace("SC_PORT=8080", f"SC_PORT={port}"))
    stop = threading.Event()
    result = {}
    t = threading.Thread(target=lambda: result.setdefault("rc", launcher.run(open_browser=False, check_every=0.5, stop_event=stop)))
    t.start()
    try:
        deadline = time.time() + 60
        while not launcher.healthy(port) and time.time() < deadline:
            time.sleep(0.5)
        assert launcher.healthy(port), launcher.last_lines(launcher.OUT_LOG)
        first = launcher.load_state()["server_pid"]
        launcher.kill_tree(first)                              # simulate a crash
        deadline = time.time() + 60
        while time.time() < deadline:
            st = launcher.load_state()
            if st.get("server_pid") not in (None, first) and launcher.healthy(port):
                break
            time.sleep(0.5)
        assert launcher.load_state()["server_pid"] != first and launcher.healthy(port)   # restarted by itself
        assert (home / "logs" / "visionops.log").exists()                                  # rotating app log in use
        second = launcher.load_state()["server_pid"]
    finally:
        stop.set()
        t.join(timeout=30)
    assert result.get("rc") == 0 and not launcher.pid_alive(second) and not launcher.healthy(port)
    assert launcher.status() == 1


def test_health_check_ignores_proxy_settings(home, monkeypatch):
    """Company PCs often set a proxy; the check must still reach our own server directly."""
    import http.server

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    for k in ("NO_PROXY", "no_proxy"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("HTTP_PROXY", "http://127.0.0.1:9")    # a proxy that does not exist
    monkeypatch.setenv("http_proxy", "http://127.0.0.1:9")
    try:
        assert launcher.healthy(srv.server_address[1])
    finally:
        srv.shutdown()
    assert not launcher.healthy(free_port()) and launcher.last_health_error
    launcher.say("hello")
    assert "hello" in (home / "logs" / "launcher.log").read_text()
