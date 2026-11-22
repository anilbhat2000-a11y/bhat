"""Start the on-prem NPU Monitor.

Local only (default):        python run.py
Joinable by a fleet hub:     python run.py --host 0.0.0.0 --token MySecret123
"""
import argparse
import os
import secrets
import webbrowser

import uvicorn

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="On-prem NPU / GPU / CPU utilisation monitor")
    ap.add_argument("--host", default="127.0.0.1",
                    help="bind address; use 0.0.0.0 so other machines (a fleet hub) can connect")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--token", default=os.environ.get("NPU_MONITOR_TOKEN", ""),
                    help="shared secret remote machines must send (required when not bound to localhost)")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()

    remote = a.host not in ("127.0.0.1", "localhost", "::1")
    if remote and not a.token:
        a.token = secrets.token_urlsafe(12)
        print(f"\n  No --token given; generated one for remote access:  {a.token}\n")
    if a.token:
        os.environ["NPU_MONITOR_TOKEN"] = a.token
    if remote:
        print(f"  Add this machine on the hub as  http://<this-ip>:{a.port}  with token  {a.token}\n")
    if not a.no_browser:
        webbrowser.open(f"http://localhost:{a.port}")
    uvicorn.run("npu_monitor.server:app", host=a.host, port=a.port, log_level="info")
