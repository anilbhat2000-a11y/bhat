"""Fleet mode: one instance ("hub") connects to others on the LAN.

Every machine runs the same app. Remote machines must be started with
``python run.py --host 0.0.0.0 --token <secret>``; the hub stores their URL and
token, polls ``/api/node`` for live status and can start the NPU assessment on
all of them at the same moment, then ranks them with ``assessment.compare``.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
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
        for p in self.peers:
            p.setdefault("kind", "agent")
        self.self_meta: dict = self._read_self()
        try:
            with open(os.path.join(DATA_DIR, "enrolment_codes.json"), encoding="utf-8") as f:
                self.codes: list[dict] = json.load(f)
        except (OSError, ValueError):
            self.codes = []
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

    META_FIELDS = ("name", "owner", "department", "location", "notes", "manufacture_date")
    MANUAL_IDENTITY = ("manufacturer", "model", "serial_number", "asset_tag", "machine_type", "cpu", "os")

    @staticmethod
    def _norm_url(url: str) -> str:
        url = url.strip().rstrip("/")
        if not url.startswith(("http://", "https://")):
            url = "http://" + url
        if ":" not in url.split("//", 1)[1]:
            url += ":8765"
        return url

    @classmethod
    def _meta(cls, fields: dict) -> dict:
        out = {}
        for k in cls.META_FIELDS:
            if k in fields and fields[k] is not None:
                v = str(fields[k]).strip()[:500]
                if k == "manufacture_date" and v and not re.match(r"^\d{4}-\d{2}(-\d{2})?$", v):
                    raise ValueError("manufacture date must be YYYY-MM-DD or YYYY-MM")
                out[k] = v
        return out

    def add(self, url: str, token: str = "", name: str = "", meta: dict | None = None,
            added_by: str = "", via: str = "connect") -> dict:
        url = self._norm_url(url)
        info = self._get(url, token, "/api/node", timeout=5)  # validate before saving
        peer = {"id": uuid.uuid4().hex[:8], "kind": "agent", "url": url, "token": token,
                "name": name or info.get("host") or url, "host": info.get("host"),
                "identity": info.get("identity"), "machine_type": info.get("machine_type"),
                "cpu": info.get("cpu"), "os": info.get("os"), "ai_pc": info.get("ai_pc"),
                "added_at": time.time(), "added_by": added_by, "via": via, "last_seen": time.time(),
                **self._meta(meta or {})}
        if name:
            peer["name"] = name
        with self._lock:
            self.peers = [p for p in self.peers if p.get("url") != url] + [peer]
            self._save()
        return self.public(peer)

    def add_manual(self, fields: dict, added_by: str = "") -> dict:
        name = str(fields.get("name") or "").strip()
        if not name:
            raise ValueError("a name is required")
        ident = {k: (str(fields.get(k)).strip()[:200] if fields.get(k) else None) for k in self.MANUAL_IDENTITY}
        peer = {"id": uuid.uuid4().hex[:8], "kind": "manual", "added_at": time.time(), "added_by": added_by,
                "via": "manual", "machine_type": ident.pop("machine_type") or "unknown",
                "cpu": ident.pop("cpu"), "os": ident.pop("os"),
                "identity": {**ident, "source": "entered manually", "available": True,
                             "manufacture": {"date": None, "source": None, "confidence": "unknown"}},
                **self._meta(fields)}
        with self._lock:
            self.peers.append(peer)
            self._save()
        return self.public(peer)

    def update(self, peer_id: str, fields: dict) -> dict:
        with self._lock:
            if peer_id == "self":
                self.self_meta.update(self._meta(fields))
                self._write_self()
                return {"id": "self", **self.self_meta}
            p = next((x for x in self.peers if x["id"] == peer_id), None)
            if not p:
                raise KeyError("machine not found")
            p.update(self._meta(fields))
            if p.get("kind") == "manual":
                for k in self.MANUAL_IDENTITY:
                    if k in fields:
                        v = (str(fields[k]).strip()[:200] or None) if fields[k] is not None else None
                        if k in ("machine_type", "cpu", "os"):
                            p[k] = v
                        else:
                            p["identity"][k] = v
            if "token" in fields and fields["token"] and p.get("kind") == "agent":
                p["token"] = str(fields["token"])
            self._save()
            return self.public(p)

    def remove(self, peer_id: str) -> None:
        with self._lock:
            self.peers = [p for p in self.peers if p["id"] != peer_id]
            self._save()

    # --- this machine's editable details ------------------------------------------------
    def _self_path(self) -> str:
        return os.path.join(DATA_DIR, "this_machine.json")

    def _read_self(self) -> dict:
        try:
            with open(self._self_path(), encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return {}

    def _write_self(self) -> None:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(self._self_path(), "w", encoding="utf-8") as f:
            json.dump(self.self_meta, f, indent=1)

    # --- enrolment codes ----------------------------------------------------------------
    def new_code(self, created_by: str, hours: float = 24) -> dict:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I
        code = "-".join("".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2))
        rec = {"hash": hashlib.sha256(code.encode()).hexdigest(), "expires": time.time() + hours * 3600,
               "created_by": created_by, "created": time.time(), "used_by": None}
        with self._lock:
            self.codes = [c for c in self.codes if c["expires"] > time.time() and not c["used_by"]] + [rec]
            self._save_codes()
        return {"code": code, "expires": rec["expires"]}

    def enrol(self, code: str, url: str, token: str, name: str, client_ip: str) -> dict:
        h = hashlib.sha256(code.strip().upper().encode()).hexdigest()
        with self._lock:
            rec = next((c for c in self.codes if hmac.compare_digest(c["hash"], h)), None)
            if not rec or rec["used_by"] or rec["expires"] < time.time():
                raise PermissionError("invalid or expired enrolment code")
            rec["used_by"] = "pending"
        try:
            url = url or f"http://{client_ip}:8765"
            host = url.split("//", 1)[-1].split(":")[0].split("/")[0]
            if host in ("0.0.0.0", "", "localhost", "127.0.0.1") and client_ip:
                url = url.replace(host, client_ip, 1)  # the machine could not tell its own LAN address
            peer = self.add(url, token, name, added_by=f"enrolment ({rec['created_by']})", via="enrolment code")
        except Exception:
            rec["used_by"] = None  # let them retry with the same code
            raise
        with self._lock:
            rec["used_by"] = peer["id"]
            self._save_codes()
        return peer

    def _save_codes(self) -> None:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(os.path.join(DATA_DIR, "enrolment_codes.json"), "w", encoding="utf-8") as f:
            json.dump(self.codes, f)

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
        changed = []

        def one(p):
            if p.get("kind") == "manual":
                return {**self.public(p), "online": None}
            t0 = time.monotonic()
            try:
                node = self._get(p["url"], p.get("token", ""), "/api/node")
                fresh = {k: node.get(k) for k in ("identity", "machine_type", "cpu", "os", "ai_pc", "host")}
                if any(p.get(k) != v for k, v in fresh.items()):
                    p.update(fresh)
                    changed.append(p["id"])
                p["last_seen"] = time.time()
                return {**self.public(p), "online": True, "rtt_ms": round((time.monotonic() - t0) * 1000), "node": node}
            except Exception as exc:
                return {**self.public(p), "online": False, "error": str(exc)[:160]}

        node = self.node_fn()
        me = {"id": "self", "kind": "self", "name": self.self_meta.get("name") or node.get("host"), "url": "local",
              "online": True, "self": True, "node": node, "identity": node.get("identity"),
              "machine_type": node.get("machine_type"), "cpu": node.get("cpu"), "os": node.get("os"),
              "ai_pc": node.get("ai_pc"), **{k: v for k, v in self.self_meta.items() if k != "name"}}
        out = [me] + list(self._pool.map(one, list(self.peers)))
        if changed:
            with self._lock:
                self._save()
        return out

    # --- run the assessment everywhere at once -------------------------------------
    def start_run(self, seconds: float) -> dict:
        run = {"id": uuid.uuid4().hex[:10], "status": "running", "created": time.time(), "seconds": seconds,
               "machines": [{"id": "self", "name": f"{self.node_fn().get('host')} (this machine)", "status": "starting", "progress": 0}]
               + [{"id": p["id"], "name": p["name"], "status": "starting", "progress": 0}
                  for p in self.peers if p.get("kind") != "manual"],
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
