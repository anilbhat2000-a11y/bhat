"""Start the on-prem NPU Monitor.  Usage:  python run.py [--host 127.0.0.1] [--port 8765]"""
import argparse
import webbrowser

import uvicorn

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="On-prem NPU / GPU / CPU utilisation monitor")
    ap.add_argument("--host", default="127.0.0.1",
                    help="bind address; keep 127.0.0.1 unless the LAN should reach it")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    if not a.no_browser:
        webbrowser.open(f"http://{'localhost' if a.host in ('0.0.0.0', '127.0.0.1') else a.host}:{a.port}")
    uvicorn.run("npu_monitor.server:app", host=a.host, port=a.port, log_level="info")
