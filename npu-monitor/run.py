"""Start 3C ITS AI PC Health Checker & NPU Performance (on-prem).

Local only (default):        python run.py
Joinable by a portal (hub):  python run.py --host 0.0.0.0 --token MySecret123
Enrol into a portal:         python run.py --enrol http://PORTAL-IP:8765 --code ABCD-EFGH
"""
import argparse
import os
import secrets
import socket
import threading
import time
import webbrowser

import uvicorn


def lan_ip(towards: str) -> str:
    """The local address this machine uses to reach the portal (no packets are sent)."""
    host = towards.split("//", 1)[-1].split("/")[0].rsplit(":", 1)[0]
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect((host, 9))
            return s.getsockname()[0]
    except OSError:
        return socket.gethostbyname(socket.gethostname())


def enrol(portal: str, code: str, port: int, token: str, name: str) -> None:
    import httpx

    portal = portal.rstrip("/")
    if not portal.startswith(("http://", "https://")):
        portal = "http://" + portal
    for _ in range(60):  # wait until our own server answers
        try:
            httpx.get(f"http://127.0.0.1:{port}/", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    url = f"http://{lan_ip(portal)}:{port}"
    try:
        r = httpx.post(f"{portal}/api/machines/enrol", timeout=20,
                       json={"code": code, "url": url, "token": token, "name": name})
        if r.status_code == 200:
            print(f"\n  ✔ Enrolled in {portal} as '{r.json()['name']}' ({url}).\n")
        else:
            detail = r.json().get("detail", r.text) if "json" in r.headers.get("content-type", "") else r.text
            print(f"\n  ✖ Enrolment failed ({r.status_code}): {detail}\n")
    except Exception as exc:
        print(f"\n  ✖ Could not reach the portal at {portal}: {exc}\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="3C ITS AI PC Health Checker & NPU Performance")
    ap.add_argument("--host", default="127.0.0.1",
                    help="bind address; use 0.0.0.0 so a portal (hub) can connect to this machine")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--token", default=os.environ.get("NPU_MONITOR_TOKEN", ""),
                    help="shared secret the portal must send (required when not bound to localhost)")
    ap.add_argument("--enrol", "--enroll", metavar="PORTAL_URL",
                    help="register this machine with a portal, e.g. http://192.168.1.10:8765")
    ap.add_argument("--code", help="one-time enrolment code from the portal's Machines > Add machine")
    ap.add_argument("--name", default="", help="name to show in the portal (default: computer name)")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()

    if a.enrol and not a.code:
        ap.error("--enrol needs --code (create one in the portal: Machines > Add machine > Enrolment code)")
    if a.enrol and a.host in ("127.0.0.1", "localhost", "::1"):
        a.host = "0.0.0.0"  # the portal must be able to reach this machine
        print("  Enrolling: listening on the network (0.0.0.0) so the portal can reach this machine.")

    remote = a.host not in ("127.0.0.1", "localhost", "::1")
    if remote and not a.token:
        a.token = secrets.token_urlsafe(12)
        print(f"\n  No --token given; generated one for remote access:  {a.token}\n")
    if a.token:
        os.environ["NPU_MONITOR_TOKEN"] = a.token
    if remote and not a.enrol:
        print(f"  Add this machine in the portal as  http://<this-ip>:{a.port}  with token  {a.token}\n")
    if a.enrol:
        threading.Thread(target=enrol, args=(a.enrol, a.code, a.port, a.token, a.name), daemon=True).start()
    if not a.no_browser:
        webbrowser.open(f"http://localhost:{a.port}/")
    print("  3C ITS AI PC Health Checker & NPU Performance  -  Make IT Simple")
    uvicorn.run("npu_monitor.server:app", host=a.host, port=a.port, log_level="info")
