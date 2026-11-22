"""Fleet mode: one NPU Monitor ("hub") connects to others on the LAN.

Every machine runs the same app. Remote machines must be started with
``python run.py --host 0.0.0.0 --token <secret>``; the hub stores their URL and
token, polls ``/api/node`` for live status and can start the NPU assessment on
all of them at the same moment, then ranks them with ``assessment.compare``.
"""
from __future__ import annotations

import json
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import httpx

from .assessment import compare
from .predict import DATA_DIR

TOKEN_HEADER = "X-NPU-Token"


class FleetManager:
    def __init__(self, node_fn, jobs) -> None:
        self.node_fn = node_fn      # () -> this machine's /api/node payload
        self.jobs = jobs            # local JobManager
        self._path = os.path.join(DATA_DIR, "fleet.json")
        self._lock = threading.Lock()
        self.peers: list[dict] = self._load()
        self.runs: dict[str, dict] = {}
        self._pool = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fleet")

    # --- peers ------------------------------------------------------------------
    def _load(self) -> list[dict]:
        try:
            with open(self._path, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return []

    def _save(self) -> None:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = self._path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.peers, f, indent=1)
        os.replace(tmp, self._path)

    def add(self, url: str, token: str = "", name: str = "") -> dict:
        url = url.strip().rstrip("/")
        if not url.startswith(("http://", "https://")):
            url = "http://" + url
        if ":" not in url.split("//", 1)[1]:
            url += ":8765"
        info = self._get(url, token, "/api/node", timeout=5)  # validate before saving
        peer = {"id": uuid.uuid4().hex[:8], "url": url, "token": token,
                "name": name or info.get("host") or url}
        with self._lock:
            self.peers = [p for p in self.peers if p["url"] != url] + [peer]
            self._save()
        return self.public(peer)

    def remove(self, peer_id: str) -> None:
        with self._lock:
            self.peers = [p for p in self.peers if p["id"] != peer_id]
            self._save()

    @staticmethod
    def public(p: dict) -> dict:
        return {k: v for k, v in p.items() if k != "token"} | {"has_token": bool(p.get("token"))}

    # --- HTTP to peers -----------------------------------------------------------
    @staticmethod
    def _headers(token: str) -> dict:
        return {TOKEN_HEADER: token} if token else {}

    def _get(self, url: str, token: str, path: str, timeout: float = 3) -> dict:
        r = httpx.get(url + path, headers=self._headers(token), timeout=timeout)
        if r.status_code == 401:
            raise RuntimeError("wrong or missing token")
        r.raise_for_status()
        return r.json()

    def _post(self, url: str, token: str, path: str, body: dict, timeout: float = 10) -> dict:
        r = httpx.post(url + path, json=body, headers=self._headers(token), timeout=timeout)
        if r.status_code == 401:
            raise RuntimeError("wrong or missing token")
        r.raise_for_status()
        return r.json()

    # --- live status --------------------------------------------------------------
    def status(self) -> list[dict]:
        def one(p):
            t0 = time.monotonic()
            try:
                node = self._get(p["url"], p.get("token", ""), "/api/node")
                return {**self.public(p), "online": True, "rtt_ms": round((time.monotonic() - t0) * 1000), "node": node}
            except Exception as exc:
                return {**self.public(p), "online": False, "error": str(exc)[:160]}

        out = [{"id": "self", "name": "This machine", "url": "local", "online": True, "self": True, "node": self.node_fn()}]
        out += list(self._pool.map(one, list(self.peers)))
        return out

    # --- run the assessment everywhere at once -------------------------------------
    def start_run(self, seconds: float) -> dict:
        run = {"id": uuid.uuid4().hex[:10], "status": "running", "created": time.time(), "seconds": seconds,
               "machines": [{"id": "self", "name": f"{self.node_fn().get('host')} (this machine)", "status": "starting", "progress": 0}]
               + [{"id": p["id"], "name": p["name"], "status": "starting", "progress": 0} for p in self.peers],
               "comparison": None}
        self.runs[run["id"]] = run
        threading.Thread(target=self._run, args=(run,), daemon=True).start()
        return run

    def _run(self, run: dict) -> None:
        peers = {p["id"]: p for p in self.peers}
        jobs: dict[str, str] = {}
        for m in run["machines"]:  # start everyone first, so they measure simultaneously
            try:
                if m["id"] == "self":
                    jobs["self"] = self.jobs.submit_assessment(run["seconds"])["id"]
                else:
                    p = peers[m["id"]]
                    jobs[m["id"]] = self._post(p["url"], p.get("token", ""), "/api/assessment",
                                               {"seconds": run["seconds"]})["id"]
                m["status"] = "running"
            except Exception as exc:
                m["status"], m["error"] = "error", str(exc)[:200]
        reports = []
        deadline = time.time() + run["seconds"] * 8 + 300
        pending = {mid for mid in jobs}
        while pending and time.time() < deadline:
            time.sleep(1.0)
            for m in run["machines"]:
                if m["id"] not in pending:
                    continue
                try:
                    if m["id"] == "self":
                        j = self.jobs.jobs.get(jobs["self"]) or {}
                    else:
                        p = peers[m["id"]]
                        j = self._get(p["url"], p.get("token", ""), f"/api/jobs/{jobs[m['id']]}", timeout=5)
                    m["progress"] = j.get("progress", 0)
                    if j.get("status") == "done":
                        rep = j["report"]
                        rep["hardware"]["fleet_name"] = m["name"]
                        reports.append(rep)
                        m.update(status="done", score=rep["score"], verdict=rep["verdict"],
                                 ai_pc=rep["hardware"].get("ai_pc", {}).get("class"))
                        pending.discard(m["id"])
                    elif j.get("status") == "error":
                        m.update(status="error", error=j.get("error"))
                        pending.discard(m["id"])
                except Exception as exc:
                    m["last_error"] = str(exc)[:160]  # transient; keep polling until deadline
        for m in run["machines"]:
            if m["id"] in pending:
                m.update(status="error", error="timed out")
        run["comparison"] = compare(reports) if reports else None
        run["status"] = "done"
