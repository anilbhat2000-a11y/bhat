"""One-click launcher and watchdog for 3C ITS VisionOps.

    python -m sentinel.launcher                 start (or open, if already running)
    python -m sentinel.launcher --stop          stop
    python -m sentinel.launcher --status        is it running?
    python -m sentinel.launcher --check         run the health checks only
    python -m sentinel.launcher --install-autostart / --remove-autostart   (Windows)

Why it exists: when the server runs inside a console window, Windows pauses it
as soon as someone clicks in that window (QuickEdit), and it stops when the
window closes or the PC sleeps. The launcher runs the server as a background
process whose output goes to a log file, checks it every few seconds, and
restarts it if it stops or stops answering.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import secrets
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "visionops.env"
LOG_DIR = ROOT / "logs"
STATE_FILE = LOG_DIR / "launcher.json"
OUT_LOG = LOG_DIR / "server-output.log"
APP_LOG = LOG_DIR / "visionops.log"
WINDOWS = platform.system() == "Windows"
# Key used by the original manual start command in the Windows instructions, kept for
# existing databases so stored device passwords stay readable.
LEGACY_KEY = "change-me-to-a-long-random-text"


LAUNCH_LOG = LOG_DIR / "launcher.log"


def say(msg: str) -> None:
    line = f"[VisionOps] {msg}"
    try:
        print(line, flush=True)
    except (OSError, ValueError):  # no console (pythonw / autostart)
        pass
    try:
        LOG_DIR.mkdir(exist_ok=True)
        with open(LAUNCH_LOG, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + line + "\n")
    except OSError:
        pass


# ---------------------------------------------------------------- settings --
def read_env(path: Path | None = None) -> dict[str, str]:
    path = path or ENV_FILE
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def ensure_env_file(path: Path | None = None, db_exists: bool | None = None) -> bool:
    """Create the settings file on first run. Returns True if it was created."""
    path = path or ENV_FILE
    if path.exists():
        return False
    if db_exists is None:
        db_exists = (ROOT / "sentinel.db").exists()
    key = LEGACY_KEY if db_exists else secrets.token_urlsafe(48)
    path.write_text(f"""# 3C ITS VisionOps settings. Edit, then restart with start-visionops.bat.
# Keep this file private: the secret key protects logins and stored camera passwords.
SC_SECRET_KEY={key}
# Password for the first 'admin' user (used only when the database is new).
SC_ADMIN_PASSWORD=Admin@123456
# 1 = add the simulated demo organizations when the database is new. Use 0 for real use.
SC_SEED_DEMO=1
# Address and port. 127.0.0.1 = this PC only. 0.0.0.0 = other PCs on your network too.
SC_HOST=127.0.0.1
SC_PORT=8080
""", encoding="utf-8")
    return True


def server_env() -> dict[str, str]:
    env = dict(os.environ)
    for k, v in read_env().items():
        env.setdefault(k, v)
    env.setdefault("SC_LOG_FILE", str(APP_LOG))
    env.setdefault("PYTHONUNBUFFERED", "1")
    return env


# ------------------------------------------------------------------ checks --
def port_in_use(host: str, port: int) -> bool:
    with socket.socket() as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1" if host in ("0.0.0.0", "") else host, port)) == 0


# Talk to our own server directly. Company PCs often have a proxy set in Windows; urllib
# would send even 127.0.0.1 through it, the check would never succeed, and the launcher
# would wrongly decide VisionOps had not started.
_DIRECT = urllib.request.build_opener(urllib.request.ProxyHandler({}))
last_health_error = ""


def healthy(port: int, timeout: float = 4) -> bool:
    global last_health_error
    try:
        with _DIRECT.open(f"http://127.0.0.1:{port}/healthz", timeout=timeout) as r:
            ok = r.status == 200 and b"ok" in r.read()
            last_health_error = "" if ok else f"unexpected reply (HTTP {r.status})"
            return ok
    except Exception as e:  # noqa: BLE001 - any failure just means "not healthy"
        last_health_error = f"{type(e).__name__}: {e}"
        return False


def port_owner_pids(port: int) -> list[int]:
    """PIDs listening on the port (Windows only; empty elsewhere)."""
    if not WINDOWS:
        return []
    r = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True, errors="replace")
    pids = set()
    for line in r.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 5 and parts[0].upper() == "TCP" and parts[1].endswith(f":{port}") and parts[3].upper() == "LISTENING":
            if parts[4].isdigit() and int(parts[4]) != 0:
                pids.add(int(parts[4]))
    return sorted(pids)


def process_name(pid: int) -> str:
    if not WINDOWS:
        return ""
    r = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"], capture_output=True, text=True, errors="replace")
    first = r.stdout.strip().splitlines()[:1]
    return first[0].split(",")[0].strip('"').lower() if first else ""


def free_stale_port(port: int) -> bool:
    """An old VisionOps left running in a (paused or hidden) PowerShell window holds the port
    but does not answer. Stop it if it is a Python process. Returns True if the port is free."""
    for pid in port_owner_pids(port):
        name = process_name(pid)
        if name.startswith("python"):
            say(f"An old VisionOps (process {pid}) is holding port {port} but not answering. Stopping it...")
            kill_tree(pid)
    for _ in range(20):
        if not port_in_use("127.0.0.1", port):
            return True
        time.sleep(0.25)
    return False


def check(fix: bool = True) -> list[str]:
    """Return a list of problems in plain words (empty = all good). With fix=True,
    repairs what it safely can (missing packages, Smart App Control blocks on SQLAlchemy)."""
    problems: list[str] = []
    if sys.version_info < (3, 11):
        problems.append(f"Python {platform.python_version()} is too old; install Python 3.11 or newer (3.13 recommended).")
        return problems
    probe = ("import fastapi, uvicorn, pydantic, jwt, bcrypt, cryptography, httpx, multipart; "
             "import sqlalchemy; from sqlalchemy.engine import result; print('ok')")
    r = subprocess.run([sys.executable, "-c", probe], capture_output=True, text=True, cwd=ROOT)
    err = (r.stderr or "").strip().splitlines()[-1:] or [""]
    if r.returncode != 0:
        text_err = r.stderr or ""
        if "No module named" in text_err and fix:
            say("Installing missing Python packages (one time)...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")], cwd=ROOT)
            return check(fix=False)
        if ("Application Control" in text_err or "DLL load failed" in text_err) and "sqlalchemy" in text_err.lower() and fix:
            say("Windows blocked a SQLAlchemy file. Installing its pure-Python version (one time)...")
            fix_sqlalchemy()
            return check(fix=False)
        if "Application Control" in text_err or "DLL load failed" in text_err:
            problems.append("Windows security (Smart App Control or a company policy) blocked a Python component: "
                            f"{err[0]}. Ask IT to allow Python's packages, or run VisionOps on a server.")
        else:
            problems.append(f"A Python package is missing or broken: {err[0]}. Run: python -m pip install -r requirements.txt")
    env = read_env()
    port = int(env.get("SC_PORT", "8080"))
    if port_in_use(env.get("SC_HOST", "127.0.0.1"), port) and not healthy(port) and not (fix and free_stale_port(port)):
        problems.append(f"Port {port} is used by another program. Close it, or set SC_PORT to another number in visionops.env.")
    try:
        LOG_DIR.mkdir(exist_ok=True)
        (LOG_DIR / ".write-test").write_text("ok")
        (LOG_DIR / ".write-test").unlink()
    except OSError as e:
        problems.append(f"Cannot write to {LOG_DIR}: {e}. Move the VisionOps folder into your own user folder.")
    return problems


def fix_sqlalchemy() -> None:
    py = sys.executable
    subprocess.run([py, "-m", "pip", "uninstall", "-y", "sqlalchemy"], cwd=ROOT)
    subprocess.run([py, "-m", "pip", "install", "setuptools", "wheel"], cwd=ROOT)
    env = dict(os.environ, DISABLE_SQLALCHEMY_CEXT="1")
    subprocess.run([py, "-m", "pip", "install", "--no-binary", "sqlalchemy", "--no-build-isolation", "--no-cache-dir",
                    "SQLAlchemy==2.1.9"], cwd=ROOT, env=env)


# ------------------------------------------------------------- process mgmt --
def save_state(**kw) -> None:
    LOG_DIR.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(kw))


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except (OSError, ValueError):
        return {}


def pid_alive(pid: int | None) -> bool:
    if not pid:
        return False
    if WINDOWS:
        r = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True)
        return str(pid) in r.stdout
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def kill_tree(pid: int | None) -> None:
    if not pid or not pid_alive(pid):
        return
    if WINDOWS:
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
    else:
        try:
            os.kill(pid, signal.SIGTERM)
            for _ in range(30):
                if not pid_alive(pid):
                    return
                time.sleep(0.1)
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass


def start_server(host: str, port: int) -> subprocess.Popen:
    LOG_DIR.mkdir(exist_ok=True)
    out = open(OUT_LOG, "w", encoding="utf-8")  # small: crashes only; normal logs go to visionops.log
    # On Windows the server runs detached from this console: clicking in or closing the
    # window can no longer pause or kill it.
    flags = (subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP) if WINDOWS else 0
    return subprocess.Popen([sys.executable, "-m", "uvicorn", "sentinel.main:app", "--host", host, "--port", str(port),
                             "--log-level", "warning", "--no-access-log"],
                            cwd=ROOT, env=server_env(), stdout=out, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                            creationflags=flags)


def last_lines(path: Path, n: int = 12) -> str:
    try:
        return "\n".join(path.read_text(encoding="utf-8", errors="replace").splitlines()[-n:])
    except OSError:
        return ""


def run(open_browser: bool = True, max_restarts: int = 5, check_every: float = 5.0, stop_event=None) -> int:
    if ensure_env_file():
        say(f"Created your settings file: {ENV_FILE.name}")
    env = read_env()
    host, port = env.get("SC_HOST", "127.0.0.1"), int(env.get("SC_PORT", "8080"))
    url = f"http://127.0.0.1:{port}"
    say(f"Python: {sys.executable}  Folder: {ROOT}")
    if healthy(port):
        say(f"VisionOps is already running. Opening {url}")
        if open_browser:
            webbrowser.open(url)
        return 0
    problems = check()
    if problems:
        say("VisionOps cannot start yet:")
        for p in problems:
            print("   - " + p, flush=True)
        return 2
    say(f"Starting VisionOps at {url} ...")
    recent_crashes: list[float] = []
    proc = start_server(host, port)
    save_state(launcher_pid=os.getpid(), server_pid=proc.pid, port=port)
    opened, misses, started_at = False, 0, time.time()
    try:
        while not (stop_event and stop_event.is_set()):
            time.sleep(check_every)
            if stop_event and stop_event.is_set():
                break
            if proc.poll() is not None:
                recent_crashes = [t for t in recent_crashes if time.time() - t < 120] + [time.time()]
                say(f"VisionOps stopped unexpectedly (code {proc.returncode}).")
                tail = last_lines(OUT_LOG)
                if tail:
                    print(tail, flush=True)
                if len(recent_crashes) >= max_restarts:
                    say("It stopped several times in a row, so the launcher has given up. The lines above show why;"
                        f" the full log is in {OUT_LOG}. Send that file to support.")
                    return 3
                say("Restarting in 5 seconds...")
                time.sleep(5)
                proc = start_server(host, port)
                save_state(launcher_pid=os.getpid(), server_pid=proc.pid, port=port)
                misses, started_at = 0, time.time()
                continue
            ok = healthy(port)
            listening = ok or port_in_use(host, port)
            if not ok and listening and not opened and time.time() - started_at > 20:
                say(f"VisionOps is listening on port {port}, but the launcher's check got: {last_health_error}."
                    " Opening the browser anyway.")
                ok = True
            if ok:
                misses = 0
                if not opened:
                    opened = True
                    say(f"VisionOps is running: {url}")
                    say("This window watches VisionOps and restarts it if needed; you can minimise it.")
                    say("To stop VisionOps, double-click stop-visionops.bat. If you close this window, VisionOps keeps running but is no longer watched.")
                    if open_browser:
                        webbrowser.open(url)
            else:
                misses += 1
                # A server that still accepts connections gets a full minute before a restart.
                if opened and misses >= (12 if listening else 3):
                    say(f"VisionOps stopped answering ({last_health_error}). Restarting it...")
                    kill_tree(proc.pid)
                    proc.wait(timeout=30)
                    proc = start_server(host, port)
                    save_state(launcher_pid=os.getpid(), server_pid=proc.pid, port=port)
                    misses = 0
                elif not opened and not listening and time.time() - started_at > 90:
                    say(f"VisionOps did not start within 90 seconds ({last_health_error}). Last lines of the log:")
                    print(last_lines(OUT_LOG), flush=True)
                    kill_tree(proc.pid)
                    return 4
    except KeyboardInterrupt:
        say("Stopping VisionOps...")
        return 0
    else:
        return 0
    finally:
        kill_tree(proc.pid)
        if load_state().get("launcher_pid") == os.getpid():
            STATE_FILE.unlink(missing_ok=True)


def stop() -> int:
    st = load_state()
    if not st:
        say("VisionOps is not running (started by the launcher).")
        return 0
    kill_tree(st.get("server_pid"))
    if st.get("launcher_pid") != os.getpid():
        kill_tree(st.get("launcher_pid"))
    STATE_FILE.unlink(missing_ok=True)
    say("VisionOps stopped.")
    return 0


def status() -> int:
    port = int(read_env().get("SC_PORT", "8080"))
    if healthy(port):
        say(f"Running at http://localhost:{port}")
        return 0
    say("Not running.")
    return 1


# --------------------------------------------------------------- autostart --
def startup_dir() -> Path:
    return Path(os.environ.get("APPDATA", "")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"


def install_autostart() -> int:
    if not WINDOWS:
        say("Automatic start is set up for Windows only. On Linux, use the systemd service in the installation guide.")
        return 1
    pyw = Path(sys.executable).with_name("pythonw.exe")
    runner = f'"{pyw}"' if pyw.exists() else f'start "" /min "{sys.executable}"'
    target = startup_dir() / "3C ITS VisionOps.bat"
    target.write_text(f'@echo off\r\ncd /d "{ROOT}"\r\n{runner} -m sentinel.launcher --no-browser\r\n', encoding="utf-8")
    say(f"VisionOps will now start automatically when you sign in to Windows ({target}).")
    return 0


def remove_autostart() -> int:
    target = startup_dir() / "3C ITS VisionOps.bat"
    if target.exists():
        target.unlink()
        say("Automatic start removed.")
    else:
        say("Automatic start was not set up.")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m sentinel.launcher", description="Start, stop and look after 3C ITS VisionOps.")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--stop", action="store_true")
    g.add_argument("--status", action="store_true")
    g.add_argument("--check", action="store_true")
    g.add_argument("--install-autostart", action="store_true")
    g.add_argument("--remove-autostart", action="store_true")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args(argv)
    os.chdir(ROOT)
    if a.stop:
        return stop()
    if a.status:
        return status()
    if a.check:
        ensure_env_file()
        problems = check()
        for p in problems:
            print(" - " + p)
        say("All checks passed." if not problems else "Fix the items above, then start again.")
        return 1 if problems else 0
    if a.install_autostart:
        return install_autostart()
    if a.remove_autostart:
        return remove_autostart()
    return run(open_browser=not a.no_browser)


if __name__ == "__main__":
    sys.exit(main())
