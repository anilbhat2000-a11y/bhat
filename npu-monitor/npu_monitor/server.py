"""FastAPI app: REST + WebSocket API and the offline dashboard."""
from __future__ import annotations

import asyncio
import csv
import io
import os
import hmac
import platform
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from . import alerts as alert_rules
from .auth import COOKIE, RANK, AuthError, AuthStore, required_role
from . import hwinfo, predict
from .assessment import compare
from .fleet import TOKEN_HEADER, FleetManager
from .inference.engine import EngineManager
from .jobs import JobManager, list_reports, load_report
from .report_html import render as render_report
from .sources.files import SUPPORTED
from .sources.live import LiveSource
from .telemetry.sampler import Sampler, impact

STATIC = os.path.join(os.path.dirname(__file__), "static")
MAX_UPLOAD = int(os.environ.get("NPU_MONITOR_MAX_UPLOAD_MB", "200")) * 1024 * 1024
LOOPBACK = {"127.0.0.1", "::1", "localhost", "testclient"}


PUBLIC_PATHS = {"/", "/login", "/forgot", "/reset", "/api/auth/forgot", "/api/auth/reset", "/api/auth/reset-check", "/api/machines/enrol", "/api/auth/login", "/api/auth/setup", "/api/auth/status", "/favicon.ico"}
# What a fleet hub may call on this machine with the machine token (no user login).
FLEET_TOKEN_ROUTES = (("GET", "/api/node"), ("POST", "/api/assessment"), ("GET", "/api/jobs/"))


def _authorised(client_host: str | None, header: str | None, query: str | None) -> bool:
    """Machine-to-machine check: does the request carry this machine's fleet token?"""
    token = os.environ.get("NPU_MONITOR_TOKEN", "")
    given = header or query or ""
    return bool(token) and bool(given) and hmac.compare_digest(given.encode(), token.encode())


def _lan_ips() -> list[str]:
    """This machine's LAN addresses, for the enrolment command shown to admins."""
    import socket

    ips = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # no packet is sent; picks the default-route interface
            ips.append(s.getsockname()[0])
    except OSError:
        pass
    try:
        ips += socket.gethostbyname_ex(socket.gethostname())[2]
    except OSError:
        pass
    return [ip for i, ip in enumerate(ips) if ip not in ips[:i] and not ip.startswith("127.")]


def _client_ip(request) -> str:
    return (request.client.host if request.client else "") or ""


class LoginReq(BaseModel):
    username: str
    password: str


class SetupReq(BaseModel):
    username: str
    password: str
    display_name: str = ""


class PasswordReq(BaseModel):
    current: str
    new: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "viewer"
    display_name: str = ""
    email: str = ""


class ForgotReq(BaseModel):
    username: str
    note: str = ""


class ResetReq(BaseModel):
    token: str
    password: str


class UserUpdate(BaseModel):
    display_name: str | None = None
    email: str | None = None
    role: str | None = None
    active: bool | None = None
    password: str | None = None


class PeerReq(BaseModel):
    url: str
    token: str = ""
    name: str = ""
    owner: str = ""
    department: str = ""
    location: str = ""
    notes: str = ""


class ManualMachine(BaseModel):
    name: str
    manufacturer: str = ""
    model: str = ""
    serial_number: str = ""
    asset_tag: str = ""
    manufacture_date: str = ""
    machine_type: str = "laptop"
    cpu: str = ""
    os: str = ""
    owner: str = ""
    department: str = ""
    location: str = ""
    notes: str = ""


class MachineUpdate(BaseModel):
    name: str | None = None
    owner: str | None = None
    department: str | None = None
    location: str | None = None
    notes: str | None = None
    manufacture_date: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    asset_tag: str | None = None
    machine_type: str | None = None
    cpu: str | None = None
    os: str | None = None
    token: str | None = None


class EnrolReq(BaseModel):
    code: str
    url: str = ""
    token: str = ""
    name: str = ""


class LiveStart(BaseModel):
    mode: str = "camera"          # "camera" | "screen"
    device: str | None = None
    camera_index: int = 0
    monitor: int = 1
    max_fps: float = 30.0


class AssessReq(BaseModel):
    seconds: float = 8.0


class BenchmarkReq(BaseModel):
    devices: list[str] = []
    seconds: float = 10.0


def create_app(sampler: Sampler | None = None, engines: EngineManager | None = None) -> FastAPI:
    state: dict = {}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        state["sampler"] = sampler or Sampler(float(os.environ.get("NPU_MONITOR_INTERVAL", "0.5")))
        state["engines"] = engines or EngineManager()
        state["live"] = LiveSource(state["engines"])
        state["jobs"] = JobManager(state["engines"], state["sampler"])
        state["hw"] = hwinfo.collect()
        state["auth"] = AuthStore()
        state["notifier"] = alert_rules.Notifier()
        state["alerts"] = []
        state["fleet"] = FleetManager(node, state["jobs"])
        state["sampler"].start()
        stop = threading.Event()
        threading.Thread(target=alert_loop, args=(stop,), name="alerts", daemon=True).start()
        yield
        stop.set()
        state["live"].stop()
        state["sampler"].stop()

    _report_cache: dict = {}

    def latest_report() -> dict | None:
        saved = list_reports()
        if not saved:
            return None
        fn = saved[0]["file"]
        if _report_cache.get("file") != fn:
            try:
                _report_cache.update(file=fn, report=load_report(fn))
            except (OSError, ValueError):
                return None
        return _report_cache["report"]

    def battery_view() -> dict:
        smp = state["sampler"]
        latest = smp.latest() or {}
        bat = latest.get("battery") or {"present": False}
        forecast = predict.health_forecast(bat)
        model = predict.workload_model(latest_report(), bat)
        return {
            "battery": bat,
            "runtime": predict.runtime(smp.since(900)),
            "forecast": forecast,
            "log": predict.read_log()[-90:],
            "impact_model": model,
            "lifespan": predict.npu_lifespan_benefit(forecast, model),
            "temps": latest.get("temps", {}),
        }

    def compute_alerts() -> list[dict]:
        smp = state["sampler"]
        latest = smp.latest()
        bat = (latest or {}).get("battery") or {}
        return alert_rules.evaluate(state["hw"], [d.as_dict() for d in state["engines"].devices], latest,
                                    smp.since(30), predict.runtime(smp.since(900)), predict.health_forecast(bat))

    def alert_loop(stop: threading.Event) -> None:
        while not stop.wait(5.0):
            try:
                state["alerts"] = compute_alerts()
                state["notifier"].update(state["hw"].get("host", ""), state["alerts"])
                latest = state["sampler"].latest()
                if latest:
                    predict.log_battery_daily(latest.get("battery") or {})
            except Exception as exc:
                print(f"[alerts] {exc}")

    def node() -> dict:
        """Compact live summary of this machine, polled by fleet hubs."""
        s = state["sampler"].latest() or {}
        rep = latest_report()
        bat = s.get("battery") or {}
        return {
            "host": state["hw"].get("host"), "cpu": state["hw"].get("cpu"), "os": state["hw"].get("os"),
            "machine_type": state["hw"].get("machine_type"), "ai_pc": state["hw"].get("ai_pc"),
            "identity": state["hw"].get("identity"),
            "rated_npu": state["hw"].get("rated_npu"), "npu_names": state["hw"].get("npu_names"),
            "devices": [d.as_dict() for d in state["engines"].devices],
            "metrics": s and {"npu": s["npu"]["util"], "npu_source": s["npu"]["source"], "cpu": s["cpu"]["util"],
                              "gpu": max((g["util"] for g in s["gpu"]), default=None) if s["gpu"] else None,
                              "mem": s["cpu"]["mem_used_pct"], "power_w": s["cpu"]["power_w"],
                              "ips": round(sum(v["ips"] for v in s["inference"].values()), 1)},
            "battery": bat.get("present") and {k: bat.get(k) for k in ("percent", "plugged", "health_pct", "cycles", "power_w")},
            "alerts": [{"level": a["level"], "title": a["title"]} for a in state["alerts"]],
            "report": rep and {"score": rep["score"], "verdict": rep["verdict"], "created": rep["created"],
                               "npu_ips": rep["metrics"].get("npu_ips")},
        }

    app = FastAPI(title="3C ITS AI PC Health Checker & NPU Performance", version="1.2.0", lifespan=lifespan)

    @app.middleware("http")
    async def auth(request: Request, call_next):
        path, method = request.url.path, request.method
        request.state.user = None
        if path.startswith("/static/") or path in PUBLIC_PATHS:
            return await call_next(request)
        if _authorised(None, request.headers.get(TOKEN_HEADER), None):
            if any(method == m and path.startswith(pfx) for m, pfx in FLEET_TOKEN_ROUTES):
                request.state.user = {"username": "fleet-hub", "role": "operator"}
                return await call_next(request)
            return JSONResponse({"detail": "the fleet token only allows status and assessment calls"}, 403)
        user = state["auth"].session_user(request.cookies.get(COOKIE))
        is_page = not path.startswith("/api")
        if user is None:
            if is_page:
                return RedirectResponse("/login", 303)
            return JSONResponse({"detail": "sign in required"}, 401)
        request.state.user = user
        if user.get("must_change_password") and not is_page and not path.startswith("/api/auth/"):
            return JSONResponse({"detail": "password change required"}, 403)
        need = "admin" if path.startswith("/admin") else required_role(method, path)
        if RANK[user["role"]] < RANK[need]:
            if is_page:
                return RedirectResponse("/app", 303)
            return JSONResponse({"detail": f"requires the {need} role"}, 403)
        return await call_next(request)

    def actor(request: Request) -> str:
        u = getattr(request.state, "user", None)
        return u["username"] if u else "?"

    def audit(request: Request, action: str, detail: str = "") -> None:
        state["auth"].audit(actor(request), action, detail, _client_ip(request))

    app.mount("/static", StaticFiles(directory=STATIC), name="static")

    @app.get("/", include_in_schema=False)
    def landing():
        return FileResponse(os.path.join(STATIC, "landing.html"))

    @app.get("/app", include_in_schema=False)
    def index():
        return FileResponse(os.path.join(STATIC, "index.html"))

    @app.get("/login", include_in_schema=False)
    def login_page():
        return FileResponse(os.path.join(STATIC, "login.html"))

    @app.get("/forgot", include_in_schema=False)
    @app.get("/reset", include_in_schema=False)
    def forgot_page():
        return FileResponse(os.path.join(STATIC, "forgot.html"))

    @app.get("/admin", include_in_schema=False)
    def admin_page():
        return FileResponse(os.path.join(STATIC, "admin.html"))

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        return FileResponse(os.path.join(STATIC, "favicon.png"))

    # --- authentication & user management ---------------------------------------------
    def _set_cookie(resp: Response, request: Request, token: str) -> None:
        resp.set_cookie(COOKIE, token, httponly=True, samesite="strict", path="/",
                        secure=request.url.scheme == "https",
                        max_age=int(state["auth"].security["session_minutes"]) * 60)

    @app.get("/api/auth/status")
    def auth_status(request: Request):
        u = state["auth"].session_user(request.cookies.get(COOKIE))
        return {"setup_required": state["auth"].setup_required, "user": u and state["auth"].public(u),
                "setup_allowed_here": _client_ip(request) in LOOPBACK,
                "min_password_length": state["auth"].security["min_password_length"]}

    @app.post("/api/auth/setup")
    def auth_setup(req: SetupReq, request: Request):
        if not state["auth"].setup_required:
            raise HTTPException(409, "setup is already complete")
        if _client_ip(request) not in LOOPBACK:
            raise HTTPException(403, "create the first administrator from this computer (http://localhost)")
        try:
            state["auth"].create_user(req.username, req.password, "admin", req.display_name)
            token, user = state["auth"].login(req.username, req.password, _client_ip(request))
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        state["auth"].audit(user["username"], "setup", "first administrator created", _client_ip(request))
        resp = JSONResponse({"user": user})
        _set_cookie(resp, request, token)
        return resp

    @app.post("/api/auth/login")
    def auth_login(req: LoginReq, request: Request):
        try:
            token, user = state["auth"].login(req.username, req.password, _client_ip(request))
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        resp = JSONResponse({"user": user})
        _set_cookie(resp, request, token)
        return resp

    @app.post("/api/auth/logout")
    def auth_logout(request: Request):
        state["auth"].logout(request.cookies.get(COOKIE))
        audit(request, "logout")
        resp = JSONResponse({"ok": True})
        resp.delete_cookie(COOKIE, path="/")
        return resp

    @app.get("/api/auth/me")
    def auth_me(request: Request):
        u = state["auth"].public(request.state.user)
        if u["role"] == "admin":
            u["pending_resets"] = len(state["auth"].pending_requests())
        return u

    # --- forgot password ------------------------------------------------------------------
    def portal_url(request: Request) -> str:
        return state["auth"].security.get("portal_url") or str(request.base_url).rstrip("/")

    def send_mail_bg(to: str, subject: str, text: str, html: str, what: str) -> None:
        smtp = dict(state["auth"].security.get("smtp") or {})

        def run():
            from .mailer import send
            try:
                send(smtp, to, subject, text, html)
            except Exception as exc:
                state["auth"].audit("system", "email_failed", f"{what} to {to}: {exc}")
        threading.Thread(target=run, daemon=True).start()

    GENERIC = ("If this account exists, a password reset link has been emailed to its owner or the administrators "
               "have been notified. Please check your email or contact your administrator.")

    @app.post("/api/auth/forgot")
    def auth_forgot(req: ForgotReq, request: Request):
        st, ip = state["auth"], _client_ip(request)
        if not st.forgot_allowed(ip):
            raise HTTPException(429, "too many requests; please try again in a few minutes")
        u = st.find_user(req.username)
        if not u or not u.get("active", True):
            st.audit(req.username[:64] or "?", "password_forgot_unknown", "", ip)
            return {"message": GENERIC}
        name = u["username"]
        from html import escape as hx
        dn, note = hx(u["display_name"]), hx(req.note or "-")
        if st.email_configured() and u.get("email"):
            token = st.create_reset_token(name)
            link = f"{portal_url(request)}/reset?token={token}"
            text = (f"Hello {u['display_name']},\n\nA password reset was requested for your account '{name}' on the "
                    f"3C ITS AI PC Health Checker.\n\nSet a new password here (valid {30} minutes, single use):\n{link}\n\n"
                    "If you did not ask for this, ignore this email; your password stays the same.\n\n3C ITS - Make IT Simple")
            html = (f"<p>Hello {dn},</p><p>A password reset was requested for your account "
                    f"<b>{name}</b> on the 3C ITS AI PC Health Checker.</p><p><a href=\"{link}\" style=\"background:#04735f;"
                    "color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none\">Set a new password</a></p>"
                    "<p>The link is valid for 30 minutes and works once. If you did not ask for this, ignore this email.</p>"
                    "<p style=\"color:#5f7d74\">3C ITS - Make IT Simple</p>")
            send_mail_bg(u["email"], "Reset your 3C ITS AI PC Health Checker password", text, html, "reset link")
            st.audit(name, "password_reset_link_sent", u["email"], ip)
        else:
            if st.add_request(name, ip, req.note):
                st.audit(name, "password_reset_requested", req.note[:120], ip)
                if st.email_configured():
                    for adm in st.users.values():
                        if adm["role"] == "admin" and adm.get("active", True) and adm.get("email") and adm["username"] != name:
                            send_mail_bg(adm["email"], f"Password reset requested: {name}",
                                         f"{u['display_name']} ({name}) asked for a password reset.\n"
                                         f"Note: {req.note or '-'}\nOpen {portal_url(request)}/admin to set a temporary password.",
                                         f"<p><b>{dn}</b> ({hx(name)}) asked for a password reset.</p>"
                                         f"<p>Note: {note}</p><p><a href=\"{portal_url(request)}/admin\">Open the Admin panel</a></p>",
                                         "admin notification")
        return {"message": GENERIC}

    @app.get("/api/auth/reset-check")
    def auth_reset_check(token: str = ""):
        name = state["auth"].token_user(token)
        return {"valid": bool(name), "username": name,
                "min_password_length": state["auth"].security["min_password_length"]}

    @app.post("/api/auth/reset")
    def auth_reset(req: ResetReq, request: Request):
        try:
            name = state["auth"].reset_with_token(req.token, req.password)
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        state["auth"].audit(name, "password_reset_by_link", "", _client_ip(request))
        return {"ok": True, "username": name}

    @app.get("/api/users/requests")
    def reset_requests():
        return state["auth"].pending_requests()

    @app.post("/api/users/requests/{req_id}/dismiss")
    def reset_request_dismiss(req_id: str, request: Request):
        q = next((x for x in state["auth"].pending_requests() if x["id"] == req_id), None)
        if not q:
            raise HTTPException(404, "request not found")
        state["auth"].resolve_requests(q["user"], actor(request), "dismissed", req_id)
        audit(request, "password_reset_request_dismissed", q["user"])
        return {"ok": True}

    @app.post("/api/users/{username}/send-reset")
    def send_reset_link(username: str, request: Request):
        st = state["auth"]
        u = st.users.get(username)
        if not u:
            raise HTTPException(404, "user not found")
        if not st.email_configured():
            raise HTTPException(400, "email is not configured (Admin panel > Security > Email)")
        if not u.get("email"):
            raise HTTPException(400, "this user has no email address; set a temporary password instead")
        token = st.create_reset_token(username)
        link = f"{portal_url(request)}/reset?token={token}"
        from .mailer import send
        try:
            send(dict(st.security.get("smtp") or {}), u["email"], "Reset your 3C ITS AI PC Health Checker password",
                 f"Hello {u['display_name']},\n\nYour administrator sent you a password reset link (valid 30 minutes, single use):\n{link}\n\n3C ITS - Make IT Simple",
                 f"<p>Hello {__import__('html').escape(u['display_name'])},</p><p>Your administrator sent you a password reset link.</p>"
                 f"<p><a href=\"{link}\">Set a new password</a> (valid 30 minutes, single use)</p>")
        except Exception as exc:
            raise HTTPException(502, f"could not send email: {exc}")
        st.resolve_requests(username, actor(request), "reset link emailed")
        audit(request, "password_reset_link_sent", f"{username} <{u['email']}>")
        return {"ok": True, "sent_to": u["email"]}

    @app.post("/api/security/test-email")
    def test_email(body: dict, request: Request):
        to = str(body.get("to") or "").strip()
        if not to:
            raise HTTPException(400, "enter an address to send the test to")
        from .mailer import send
        try:
            send(dict(state["auth"].security.get("smtp") or {}), to, "3C ITS AI PC Health Checker: test email",
                 "Email is working. Password reset links can now be sent from the portal.\n\n3C ITS - Make IT Simple")
        except Exception as exc:
            raise HTTPException(502, f"could not send email: {exc}")
        audit(request, "test_email_sent", to)
        return {"ok": True}

    @app.post("/api/auth/password")
    def auth_password(req: PasswordReq, request: Request):
        try:
            state["auth"].change_own_password(actor(request), req.current, req.new)
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        audit(request, "password_changed")
        return {"ok": True}

    @app.get("/api/users")
    def users_list():
        return sorted((state["auth"].public(u) for u in state["auth"].users.values()), key=lambda u: u["username"].lower())

    @app.post("/api/users")
    def users_create(req: UserCreate, request: Request):
        try:
            u = state["auth"].create_user(req.username, req.password, req.role, req.display_name, must_change=True,
                                          email=req.email)
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        audit(request, "user_created", f"{u['username']} ({u['role']})")
        return u

    @app.patch("/api/users/{username}")
    def users_update(username: str, req: UserUpdate, request: Request):
        try:
            u = state["auth"].update_user(username, actor(request), display_name=req.display_name, role=req.role,
                                          active=req.active, password=req.password, email=req.email)
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        changes = [f"{k}={v}" for k, v in req.model_dump().items() if v is not None and k != "password"]
        if req.password:
            changes.append("password reset")
        audit(request, "user_updated", f"{username}: {', '.join(changes)}")
        return u

    @app.delete("/api/users/{username}")
    def users_delete(username: str, request: Request):
        try:
            state["auth"].delete_user(username, actor(request))
        except AuthError as e:
            raise HTTPException(e.status, str(e))
        audit(request, "user_deleted", username)
        return {"ok": True}

    @app.get("/api/audit")
    def audit_log(limit: int = Query(300, ge=1, le=2000)):
        return state["auth"].read_audit(limit)

    @app.get("/api/security")
    def security_get():
        return {**state["auth"].public_security(), "fleet_token_set": bool(os.environ.get("NPU_MONITOR_TOKEN")),
                "active_sessions": len(state["auth"].sessions)}

    @app.put("/api/security")
    def security_put(values: dict, request: Request):
        try:
            sec = state["auth"].update_security(values)
        except (AuthError, ValueError, TypeError) as e:
            raise HTTPException(400, str(e))
        audit(request, "security_updated", ", ".join(k if k == "smtp" else f"{k}={v}" for k, v in values.items()))
        return sec

    # --- system & telemetry ----------------------------------------------------
    @app.get("/api/system")
    def system():
        return {
            "host": platform.node(), "os": f"{platform.system()} {platform.release()}",
            "cpu": platform.processor() or platform.machine(),
            "hardware": state["hw"],
            "telemetry": state["sampler"].describe(),
            "inference": state["engines"].describe(),
            "supported_files": sorted(SUPPORTED),
            "lan_ips": _lan_ips(),
        }

    @app.get("/api/metrics")
    def metrics():
        return state["sampler"].latest() or {}

    @app.get("/api/history")
    def history(seconds: float = Query(120, ge=1, le=3600)):
        return state["sampler"].since(seconds)

    @app.get("/api/impact")
    def impact_view(seconds: float = Query(300, ge=10, le=3600)):
        return impact(state["sampler"].since(seconds))

    @app.get("/api/export.csv")
    def export_csv(seconds: float = Query(900, ge=1, le=3600)):
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["timestamp", "phase", "npu_util", "npu_source", "npu_app_util", "cpu_util",
                    "app_cpu_util", "gpu_util_max", "mem_used_pct", "power_w", "battery_pct", "battery_w",
                    "battery_health_pct", "plugged", "workloads"])
        for s in state["sampler"].since(seconds):
            w.writerow([round(s["ts"], 3), s["phase"], s["npu"]["util"], s["npu"]["source"], s["npu"]["app_util"],
                        s["cpu"]["util"], s["cpu"]["app_util"], max((g["util"] for g in s["gpu"]), default=""),
                        s["cpu"]["mem_used_pct"], s["cpu"]["power_w"] if s["cpu"]["power_w"] is not None else "",
                        *(("", "", "", "") if not s.get("battery", {}).get("present") else
                          (s["battery"].get("percent"), s["battery"].get("power_w"), s["battery"].get("health_pct"),
                           s["battery"].get("plugged"))),
                        ";".join(f"{k}={v}" for k, v in s["workloads"].items())])
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=npu-telemetry.csv"})

    @app.websocket("/ws/metrics")
    async def ws_metrics(ws: WebSocket):
        if state["auth"].session_user(ws.cookies.get(COOKIE)) is None:
            await ws.close(code=4401)
            return
        await ws.accept()
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue(maxsize=20)

        def push(sample):
            def put():
                if queue.full():
                    queue.get_nowait()
                queue.put_nowait(sample)
            loop.call_soon_threadsafe(put)

        state["sampler"].subscribe(push)
        try:
            while True:
                s = await queue.get()
                await ws.send_json({"sample": s, "live": state["live"].status})
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            state["sampler"].unsubscribe(push)

    # --- live camera / screen ----------------------------------------------------
    @app.post("/api/live/start")
    def live_start(req: LiveStart, request: Request):
        audit(request, "live_started", f"{req.mode} on {req.device}")
        try:
            return state["live"].start(req.mode, req.device, req.camera_index, req.max_fps, req.monitor)
        except Exception as exc:
            raise HTTPException(400, str(exc))

    @app.post("/api/live/stop")
    def live_stop():
        state["live"].stop()
        return state["live"].status

    @app.get("/api/live/status")
    def live_status():
        return state["live"].status

    @app.get("/api/live/stream")
    async def live_stream():
        async def frames():
            last = -1
            while True:
                fid, jpg = state["live"].latest_jpeg()
                if jpg is not None and fid != last:
                    last = fid
                    yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n"
                elif not state["live"].status.get("running"):
                    if jpg is None:
                        break
                await asyncio.sleep(0.02)
        return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")

    @app.post("/api/frame")
    async def classify_frame(request: Request, device: str | None = None):
        """Browser-camera path: the page posts a JPEG frame, we infer on it."""
        body = await request.body()
        if not body or len(body) > 10 * 1024 * 1024:
            raise HTTPException(400, "send one JPEG/PNG frame (max 10 MB) as the request body")
        try:
            img = Image.open(io.BytesIO(body)).convert("RGB")
            return await asyncio.to_thread(state["engines"].get(device).classify, img, "browser-camera", 3)
        except Exception as exc:
            raise HTTPException(400, str(exc))

    # --- documents ---------------------------------------------------------------
    @app.post("/api/files")
    async def upload(files: list[UploadFile] = File(...), device: str | None = Form(None), repeat: int = Form(1)):
        payload, total = [], 0
        for f in files:
            data = await f.read()
            total += len(data)
            if total > MAX_UPLOAD:
                raise HTTPException(413, f"upload exceeds {MAX_UPLOAD // 1024 // 1024} MB")
            payload.append((os.path.basename(f.filename or "upload"), data))
        job = state["jobs"].submit_files(payload, device or None, repeat)
        return {"id": job["id"]}

    # --- benchmark & jobs ----------------------------------------------------------
    @app.post("/api/benchmark")
    def benchmark(req: BenchmarkReq):
        job = state["jobs"].submit_benchmark(req.devices, req.seconds)
        return {"id": job["id"]}

    # --- NPU suitability assessment -----------------------------------------------
    @app.post("/api/assessment")
    def run_assessment(req: AssessReq, request: Request):
        job = state["jobs"].submit_assessment(req.seconds)
        audit(request, "assessment_started", f"{req.seconds}s per device")
        return {"id": job["id"]}

    @app.get("/api/reports")
    def reports():
        return list_reports()

    @app.get("/api/reports/{filename}")
    def report_json(filename: str):
        try:
            return load_report(filename)
        except (OSError, ValueError):
            raise HTTPException(404, "report not found")

    @app.get("/api/reports/{filename}/html", response_class=HTMLResponse)
    def report_page(filename: str):
        try:
            return render_report(load_report(filename))
        except (OSError, ValueError):
            raise HTTPException(404, "report not found")

    @app.post("/api/compare")
    def compare_machines(reports: list[dict]):
        """Body: a list of report JSON objects (from this or other machines)."""
        valid = [r for r in reports if isinstance(r, dict) and "hardware" in r and "score" in r]
        if len(valid) < 1:
            raise HTTPException(400, "send one or more assessment report JSON objects")
        return compare(valid)

    # --- node / battery / alerts ----------------------------------------------------
    @app.get("/api/node")
    def node_view():
        return node()

    @app.get("/api/battery")
    def battery():
        return battery_view()

    @app.get("/api/alerts")
    def alerts_view():
        return {"active": state["alerts"], "history": state["notifier"].history[-50:],
                "ai_pc": state["hw"].get("ai_pc"), "webhook": bool(state["notifier"].url)}

    # --- fleet ----------------------------------------------------------------------
    @app.get("/api/fleet")
    def fleet_status():
        return state["fleet"].status()

    @app.post("/api/fleet/peers")
    def fleet_add(req: PeerReq, request: Request):
        try:
            peer = state["fleet"].add(req.url, req.token, req.name, meta=req.model_dump(), added_by=actor(request))
            audit(request, "fleet_machine_added", f"{peer['name']} {peer['url']}")
            return peer
        except Exception as exc:
            raise HTTPException(400, f"could not reach {req.url}: {exc}")

    @app.delete("/api/fleet/peers/{peer_id}")
    def fleet_remove(peer_id: str, request: Request):
        state["fleet"].remove(peer_id)
        audit(request, "fleet_machine_removed", peer_id)
        return {"ok": True}

    @app.post("/api/fleet/run")
    def fleet_run(req: AssessReq, request: Request):
        audit(request, "fleet_run_started", f"{len(state['fleet'].peers) + 1} machines")
        return {"id": state["fleet"].start_run(max(3.0, min(req.seconds, 60.0)))["id"]}

    @app.get("/api/fleet/runs/{run_id}")
    def fleet_run_status(run_id: str):
        r = state["fleet"].runs.get(run_id)
        if r is None:
            raise HTTPException(404, "run not found")
        return r

    # --- machine inventory ------------------------------------------------------------
    @app.get("/api/identity")
    def identity_view():
        return state["hw"].get("identity") or {}

    @app.post("/api/machines/manual")
    def machine_manual(req: ManualMachine, request: Request):
        try:
            m = state["fleet"].add_manual(req.model_dump(), added_by=actor(request))
        except ValueError as e:
            raise HTTPException(400, str(e))
        audit(request, "machine_registered", f"{m['name']} (manual, serial {req.serial_number or '-'})")
        return m

    @app.patch("/api/machines/{machine_id}")
    def machine_update(machine_id: str, req: MachineUpdate, request: Request):
        fields = {k: v for k, v in req.model_dump().items() if v is not None}
        try:
            m = state["fleet"].update(machine_id, fields)
        except KeyError:
            raise HTTPException(404, "machine not found")
        except ValueError as e:
            raise HTTPException(400, str(e))
        audit(request, "machine_updated", f"{machine_id}: {', '.join(k for k in fields if k != 'token')}")
        return m

    @app.delete("/api/machines/{machine_id}")
    def machine_delete(machine_id: str, request: Request):
        state["fleet"].remove(machine_id)
        audit(request, "machine_removed", machine_id)
        return {"ok": True}

    @app.post("/api/machines/codes")
    def machine_code(request: Request):
        c = state["fleet"].new_code(actor(request))
        audit(request, "enrolment_code_created", f"expires {time.strftime('%Y-%m-%d %H:%M', time.localtime(c['expires']))}")
        return c

    _enrol_fail: dict = {}

    @app.post("/api/machines/enrol")
    def machine_enrol(req: EnrolReq, request: Request):
        ip = _client_ip(request)
        recent = [t for t in _enrol_fail.get(ip, []) if time.time() - t < 900]
        if len(recent) >= 10:
            raise HTTPException(429, "too many failed enrolment attempts; try again later")
        try:
            peer = state["fleet"].enrol(req.code, req.url, req.token, req.name, ip)
        except PermissionError as e:
            _enrol_fail[ip] = recent + [time.time()]
            state["auth"].audit("enrolment", "enrolment_failed", str(e), ip)
            raise HTTPException(403, str(e))
        except Exception as e:
            raise HTTPException(400, f"code accepted, but the portal could not reach the machine: {e}")
        state["auth"].audit("enrolment", "machine_enrolled", f"{peer['name']} {peer['url']}", ip)
        return {"id": peer["id"], "name": peer["name"]}

    @app.get("/api/machines.csv")
    def machines_csv():
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["name", "type", "status", "manufacturer", "model", "serial_number", "asset_tag",
                    "manufacture_date", "manufacture_date_source", "bios_version", "machine_type", "cpu", "os",
                    "ai_pc", "owner", "department", "location", "notes", "added_by", "added_at", "url"])
        for m in state["fleet"].status():
            idn = m.get("identity") or {}
            est = idn.get("manufacture") or {}
            mdate = m.get("manufacture_date") or est.get("date") or ""
            src = "set by admin" if m.get("manufacture_date") else (est.get("source") or "")
            status = "manual entry" if m.get("online") is None else ("online" if m.get("online") else "offline")
            w.writerow([m.get("name"), m.get("kind"), status, idn.get("manufacturer"), idn.get("model"),
                        idn.get("serial_number"), idn.get("asset_tag"), mdate, src, idn.get("bios_version"),
                        m.get("machine_type"), m.get("cpu"), m.get("os"), (m.get("ai_pc") or {}).get("class"),
                        m.get("owner"), m.get("department"), m.get("location"), m.get("notes"), m.get("added_by"),
                        time.strftime("%Y-%m-%d", time.localtime(m["added_at"])) if m.get("added_at") else "",
                        "" if m.get("self") else m.get("url")])
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=3c-its-machines.csv"})

    @app.get("/api/jobs")
    def jobs():
        return state["jobs"].summary()

    @app.get("/api/jobs/{job_id}")
    def job(job_id: str):
        j = state["jobs"].jobs.get(job_id)
        if j is None:
            return JSONResponse({"detail": "not found"}, 404)
        return j

    return app


app = create_app()
