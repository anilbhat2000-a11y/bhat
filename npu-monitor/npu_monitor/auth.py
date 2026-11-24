"""Users, roles, sessions, login lockout and audit log.

* Passwords: PBKDF2-HMAC-SHA256, 310 000 iterations, 16-byte random salt.
* Sessions: random 32-byte tokens in an HttpOnly, SameSite=Strict cookie,
  expiring after ``session_minutes`` of inactivity (kept in memory, so a
  restart signs everyone out).
* Lockout: 5 failed logins for a username (or from an address) within 15 min
  lock further attempts for 5 min.
* Roles: viewer < operator < admin (see ``PERMISSIONS``).
* Storage: ``data/users.json``, ``data/security.json``, ``data/audit.jsonl``.
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

from .predict import DATA_DIR

ROLES = ("viewer", "operator", "admin")
RANK = {r: i for i, r in enumerate(ROLES)}
ITERATIONS = 310_000
COOKIE = "npu_session"
USERNAME_RE = re.compile(r"^[A-Za-z0-9._@-]{3,64}$")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")
RESET_TOKEN_MINUTES = 30

DEFAULT_SECURITY = {"session_minutes": 480, "min_password_length": 10, "max_failed_logins": 5, "lockout_minutes": 5}

# (method, path prefix) -> minimum role. First match wins; unmatched /api paths need "viewer".
PERMISSIONS: list[tuple[str, str, str]] = [
    ("*", "/api/users", "admin"),
    ("*", "/api/audit", "admin"),
    ("*", "/api/security", "admin"),
    ("POST", "/api/fleet", "admin"),
    ("POST", "/api/machines", "admin"),
    ("PATCH", "/api/machines", "admin"),
    ("DELETE", "/api/machines", "admin"),
    ("DELETE", "/api/fleet", "admin"),
    ("POST", "/api/assessment", "operator"),
    ("POST", "/api/benchmark", "operator"),
    ("POST", "/api/live", "operator"),
    ("POST", "/api/files", "operator"),
    ("POST", "/api/frame", "operator"),
    ("POST", "/api/compare", "viewer"),
]


def required_role(method: str, path: str) -> str:
    for m, prefix, role in PERMISSIONS:
        if (m == "*" or m == method) and path.startswith(prefix):
            return role
    return "viewer"


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt, digest = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters))
        return algo == "pbkdf2_sha256" and hmac.compare_digest(dk.hex(), digest)
    except (ValueError, TypeError):
        return False


class AuthError(Exception):
    def __init__(self, msg: str, status: int = 400):
        super().__init__(msg)
        self.status = status


class AuthStore:
    def __init__(self, data_dir: str | None = None) -> None:
        self.dir = data_dir or DATA_DIR
        self._lock = threading.RLock()
        self.users: dict[str, dict] = self._read("users.json", {})
        self.security: dict = {**DEFAULT_SECURITY, **self._read("security.json", {})}
        self.sessions: dict[str, dict] = {}
        self._failures: dict[str, list[float]] = {}
        # Dummy hash so unknown usernames cost the same time as wrong passwords.
        self._dummy = hash_password(secrets.token_hex(8))

    # --- persistence ------------------------------------------------------------
    def _read(self, name: str, default):
        try:
            with open(os.path.join(self.dir, name), encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return default

    def _write(self, name: str, data) -> None:
        os.makedirs(self.dir, exist_ok=True)
        path = os.path.join(self.dir, name)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=1)
        os.replace(tmp, path)
        try:
            os.chmod(path, 0o600)  # password hashes: owner-only where the OS supports it
        except OSError:
            pass

    def audit(self, actor: str, action: str, detail: str = "", ip: str = "") -> None:
        os.makedirs(self.dir, exist_ok=True)
        rec = {"ts": time.time(), "actor": actor, "action": action, "detail": detail, "ip": ip}
        with self._lock, open(os.path.join(self.dir, "audit.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(rec) + "\n")

    def read_audit(self, limit: int = 300) -> list[dict]:
        try:
            with open(os.path.join(self.dir, "audit.jsonl"), encoding="utf-8") as f:
                lines = f.readlines()[-limit:]
            return [json.loads(x) for x in reversed(lines) if x.strip()]
        except (OSError, ValueError):
            return []

    # --- users ------------------------------------------------------------------
    @property
    def setup_required(self) -> bool:
        return not self.users

    def public(self, u: dict) -> dict:
        return {k: u.get(k) for k in ("username", "display_name", "email", "role", "active", "created",
                                      "last_login", "must_change_password")}

    @staticmethod
    def _clean_email(email: str | None) -> str | None:
        email = (email or "").strip()
        if email and not EMAIL_RE.match(email):
            raise AuthError("that does not look like an email address")
        return email or None

    def _check_password(self, password: str) -> None:
        n = int(self.security["min_password_length"])
        if len(password) < n:
            raise AuthError(f"password must be at least {n} characters")
        if password.isdigit() or password.isalpha():
            raise AuthError("password must mix letters with digits or symbols")

    def _active_admins(self) -> int:
        return sum(1 for u in self.users.values() if u["role"] == "admin" and u.get("active", True))

    def create_user(self, username: str, password: str, role: str = "viewer", display_name: str = "",
                    must_change: bool = False, email: str | None = None) -> dict:
        username = username.strip()
        if not USERNAME_RE.match(username):
            raise AuthError("username: 3-64 characters, letters, digits and . _ @ - only")
        if role not in ROLES:
            raise AuthError(f"role must be one of {', '.join(ROLES)}")
        self._check_password(password)
        with self._lock:
            if username.lower() in (k.lower() for k in self.users):
                raise AuthError("that username already exists", 409)
            self.users[username] = {"username": username, "display_name": display_name.strip() or username,
                                    "email": self._clean_email(email),
                                    "role": role, "active": True, "password": hash_password(password),
                                    "created": time.time(), "last_login": None, "must_change_password": must_change}
            self._write("users.json", self.users)
            return self.public(self.users[username])

    def update_user(self, username: str, actor: str, *, display_name: str | None = None, role: str | None = None,
                    active: bool | None = None, password: str | None = None, email: str | None = None) -> dict:
        with self._lock:
            u = self.users.get(username)
            if not u:
                raise AuthError("user not found", 404)
            demoting = (role is not None and role != "admin") or active is False
            if u["role"] == "admin" and u.get("active", True) and demoting and self._active_admins() <= 1:
                raise AuthError("cannot remove the last active administrator")
            if username == actor and (active is False or (role is not None and role != u["role"])):
                raise AuthError("you cannot change your own role or disable your own account")
            if display_name is not None:
                u["display_name"] = display_name.strip() or username
            if email is not None:
                u["email"] = self._clean_email(email)
            if role is not None:
                if role not in ROLES:
                    raise AuthError("invalid role")
                u["role"] = role
            if active is not None:
                u["active"] = bool(active)
            if password:
                self._check_password(password)
                u["password"] = hash_password(password)
                u["must_change_password"] = username != actor  # admin reset -> user must choose a new one
                self.resolve_requests(username, actor, "temporary password set")
            self._write("users.json", self.users)
            if username != actor and (active is False or role is not None or password):
                self.end_sessions(username)  # force re-login with the new rights / password
            return self.public(u)

    def delete_user(self, username: str, actor: str) -> None:
        with self._lock:
            u = self.users.get(username)
            if not u:
                raise AuthError("user not found", 404)
            if username == actor:
                raise AuthError("you cannot delete your own account")
            if u["role"] == "admin" and u.get("active", True) and self._active_admins() <= 1:
                raise AuthError("cannot delete the last active administrator")
            del self.users[username]
            self._write("users.json", self.users)
            self.end_sessions(username)

    def change_own_password(self, username: str, current: str, new: str) -> None:
        with self._lock:
            u = self.users.get(username)
            if not u or not verify_password(current, u["password"]):
                raise AuthError("current password is incorrect", 403)
            if current == new:
                raise AuthError("choose a password different from the current one")
            self._check_password(new)
            u["password"] = hash_password(new)
            u["must_change_password"] = False
            self._write("users.json", self.users)

    def update_security(self, values: dict) -> dict:
        limits = {"session_minutes": (5, 7 * 24 * 60), "min_password_length": (8, 64),
                  "max_failed_logins": (3, 20), "lockout_minutes": (1, 120)}
        with self._lock:
            for k, (lo, hi) in limits.items():
                if k in values:
                    v = int(values[k])
                    if not lo <= v <= hi:
                        raise AuthError(f"{k} must be between {lo} and {hi}")
                    self.security[k] = v
            if "smtp" in values and isinstance(values["smtp"], dict):
                cur = dict(self.security.get("smtp") or {})
                new = values["smtp"]
                for k in ("host", "username", "from_addr", "security"):
                    if k in new:
                        cur[k] = str(new[k] or "").strip()[:255]
                if "port" in new:
                    port = int(new["port"] or 0)
                    if port and not 1 <= port <= 65535:
                        raise AuthError("SMTP port must be between 1 and 65535")
                    cur["port"] = port or None
                if new.get("password"):  # blank keeps the stored password
                    cur["password"] = str(new["password"])
                if new.get("clear_password"):
                    cur.pop("password", None)
                if cur.get("security") not in (None, "", "starttls", "ssl", "none"):
                    raise AuthError("SMTP security must be starttls, ssl or none")
                self.security["smtp"] = cur
            if "portal_url" in values:
                url = str(values["portal_url"] or "").strip().rstrip("/")
                if url and not re.match(r"^https?://[^\s/]+(:\d+)?(/.*)?$", url):
                    raise AuthError("portal address must look like http://192.168.1.205:8765")
                self.security["portal_url"] = url
            self._write("security.json", self.security)
            return self.public_security()

    def public_security(self) -> dict:
        out = {k: v for k, v in self.security.items() if k != "smtp"}
        smtp = dict(self.security.get("smtp") or {})
        out["smtp"] = {**{k: v for k, v in smtp.items() if k != "password"}, "has_password": bool(smtp.get("password"))}
        out["email_configured"] = self.email_configured()
        return out

    def email_configured(self) -> bool:
        smtp = self.security.get("smtp") or {}
        return bool(smtp.get("host") and smtp.get("from_addr"))

    # --- forgot password: reset links and admin requests -----------------------------------------
    def _resets(self) -> dict:
        if not hasattr(self, "_reset_cache"):
            self._reset_cache = self._read("password_resets.json", {"tokens": {}, "requests": []})
        return self._reset_cache

    def _save_resets(self) -> None:
        self._write("password_resets.json", self._resets())

    def find_user(self, name: str) -> dict | None:
        name = (name or "").strip().lower()
        return next((v for k, v in self.users.items() if k.lower() == name or (v.get("email") or "").lower() == name), None)

    def create_reset_token(self, username: str) -> str:
        token = secrets.token_urlsafe(32)
        h = hashlib.sha256(token.encode()).hexdigest()
        with self._lock:
            r = self._resets()
            now = time.time()
            r["tokens"] = {k: v for k, v in r["tokens"].items() if v["expires"] > now and v["user"] != username}
            r["tokens"][h] = {"user": username, "expires": now + RESET_TOKEN_MINUTES * 60}
            self._save_resets()
        return token

    def token_user(self, token: str) -> str | None:
        rec = self._resets()["tokens"].get(hashlib.sha256((token or "").encode()).hexdigest())
        if not rec or rec["expires"] < time.time() or rec["user"] not in self.users:
            return None
        return rec["user"]

    def reset_with_token(self, token: str, new_password: str) -> str:
        h = hashlib.sha256((token or "").encode()).hexdigest()
        with self._lock:
            r = self._resets()
            rec = r["tokens"].get(h)
            if not rec or rec["expires"] < time.time() or rec["user"] not in self.users:
                raise AuthError("this reset link is invalid or has expired; request a new one", 400)
            self._check_password(new_password)
            u = self.users[rec["user"]]
            u["password"] = hash_password(new_password)
            u["must_change_password"] = False
            del r["tokens"][h]
            self._save_resets()
            self._write("users.json", self.users)
            self.end_sessions(u["username"])
            for k in list(self._failures):
                if k == f"u:{u['username'].lower()}":
                    self._failures.pop(k)
            self.resolve_requests(u["username"], u["username"], "reset by email link")
            return u["username"]

    def add_request(self, username: str, ip: str, note: str = "") -> bool:
        """Queue a reset request for administrators. Returns False if one is already pending."""
        with self._lock:
            r = self._resets()
            if any(q["user"] == username and q["status"] == "pending" for q in r["requests"]):
                return False
            r["requests"].append({"id": secrets.token_hex(6), "user": username, "ts": time.time(), "ip": ip,
                                  "note": (note or "").strip()[:300], "status": "pending"})
            r["requests"] = r["requests"][-500:]
            self._save_resets()
            return True

    def pending_requests(self) -> list[dict]:
        out = []
        for q in self._resets()["requests"]:
            if q["status"] == "pending":
                u = self.users.get(q["user"]) or {}
                out.append({**q, "display_name": u.get("display_name"), "role": u.get("role"),
                            "email": u.get("email"), "active": u.get("active", True)})
        return sorted(out, key=lambda q: -q["ts"])

    def resolve_requests(self, username: str, actor: str, outcome: str, req_id: str | None = None) -> int:
        n = 0
        for q in self._resets()["requests"]:
            if q["status"] == "pending" and q["user"] == username and (req_id is None or q["id"] == req_id):
                q.update(status="done", resolved_by=actor, resolved_at=time.time(), outcome=outcome)
                n += 1
        if n:
            self._save_resets()
        return n

    def forgot_allowed(self, ip: str) -> bool:
        key = f"forgot:{ip}"
        now = time.time()
        recent = [t for t in self._failures.get(key, []) if now - t < 15 * 60]
        self._failures[key] = recent + [now]
        return len(recent) < 5

    # --- login / sessions ---------------------------------------------------------
    def _locked(self, key: str) -> bool:
        now = time.time()
        recent = [t for t in self._failures.get(key, []) if now - t < 15 * 60]
        self._failures[key] = recent
        if len(recent) >= int(self.security["max_failed_logins"]):
            return now - recent[-1] < int(self.security["lockout_minutes"]) * 60
        return False

    def login(self, username: str, password: str, ip: str) -> tuple[str, dict]:
        keys = (f"u:{username.lower()}", f"ip:{ip}")
        if any(self._locked(k) for k in keys):
            raise AuthError(f"too many failed attempts; try again in {self.security['lockout_minutes']} minutes", 429)
        u = next((v for k, v in self.users.items() if k.lower() == username.strip().lower()), None)
        ok = verify_password(password, u["password"] if u else self._dummy)
        if not (u and ok and u.get("active", True)):
            for k in keys:
                self._failures.setdefault(k, []).append(time.time())
            self.audit(username or "?", "login_failed", "disabled account" if u and ok else "", ip)
            raise AuthError("invalid username or password", 401)
        for k in keys:
            self._failures.pop(k, None)
        token = secrets.token_urlsafe(32)
        with self._lock:
            u["last_login"] = time.time()
            self._write("users.json", self.users)
            self.sessions[token] = {"user": u["username"], "created": time.time(), "seen": time.time(), "ip": ip}
        self.audit(u["username"], "login", "", ip)
        return token, self.public(u)

    def session_user(self, token: str | None) -> dict | None:
        if not token:
            return None
        s = self.sessions.get(token)
        if not s:
            return None
        if time.time() - s["seen"] > int(self.security["session_minutes"]) * 60:
            self.sessions.pop(token, None)
            return None
        u = self.users.get(s["user"])
        if not u or not u.get("active", True):
            self.sessions.pop(token, None)
            return None
        s["seen"] = time.time()
        return u

    def logout(self, token: str | None) -> None:
        if token:
            self.sessions.pop(token, None)

    def end_sessions(self, username: str, keep: str | None = None) -> None:
        for t, s in list(self.sessions.items()):
            if s["user"] == username and t != keep:
                self.sessions.pop(t, None)
