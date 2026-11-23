"""Alert notifications to the contacts configured on each location.

A contact on a location receives alerts for that location and everything under
it, filtered by severity and device type. Contacts with an escalation delay are
notified only if the alert is still unacknowledged after that many minutes.
Each (alert, contact, channel) is sent at most once; every attempt is logged.
"""
from __future__ import annotations

import json
import logging
import re
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from urllib.parse import quote

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .models import NVR, SEVERITY_RANK, Alert, AlertContact, Camera, NotificationLog, utcnow
from .security import ancestors, location_path, location_tree

log = logging.getLogger("sentinel.notify")

PHONE_RE = re.compile(r"^\+?[0-9]{8,15}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_phone(raw: str) -> str:
    return re.sub(r"[\s\-().]", "", raw or "")


class NotConfigured(Exception):
    pass


def send_email(to: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        raise NotConfigured("email not configured (SC_SMTP_HOST)")
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.smtp_from, to, subject
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as s:
        if settings.smtp_starttls:
            s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


def build_sms_request(phone: str, message: str) -> dict:
    url = settings.sms_url.replace("{phone}", quote(phone)).replace("{message}", quote(message))
    req = {"method": settings.sms_method, "url": url, "headers": json.loads(settings.sms_headers or "{}")}
    if settings.sms_method != "GET":
        esc = lambda v: json.dumps(v)[1:-1]  # noqa: E731  JSON-escape without quotes
        req["content"] = settings.sms_body.replace("{phone}", esc(phone)).replace("{message}", esc(message))
        req["headers"].setdefault("Content-Type", "application/json")
    return req


def send_sms(phone: str, message: str, client: httpx.Client | None = None) -> None:
    if not settings.sms_url:
        raise NotConfigured("SMS not configured (SC_SMS_URL)")
    req = build_sms_request(phone, message)
    own = client is None
    client = client or httpx.Client(timeout=10)
    try:
        r = client.request(req["method"], req["url"], headers=req["headers"], content=req.get("content"))
        r.raise_for_status()
    finally:
        if own:
            client.close()


def alert_text(alert: Alert, path: str) -> tuple[str, str, str]:
    """Returns (email subject, email body, sms text)."""
    sev = alert.severity.upper()
    subject = f"[{sev}] {alert.message}"
    link = f"\nOpen: {settings.public_url.rstrip('/')}/#/alerts" if settings.public_url else ""
    body = (f"Severity: {sev}\nAlert: {alert.message}\nLocation: {path}\n"
            f"Opened: {alert.opened_at:%Y-%m-%d %H:%M} UTC\nStatus: {alert.status}{link}\n\n— 3C ITS VisionOps")
    sms = f"3C ITS VisionOps {sev}: {alert.message} @ {path}"[:300]
    return subject, body, sms


def _record(db: Session, alert: Alert | None, contact: AlertContact, channel: str, target: str, status: str, error: str = ""):
    db.add(NotificationLog(alert_id=alert.id if alert else None, contact_id=contact.id, location_id=contact.location_id,
                           channel=channel, target=target, status=status, error=error[:500]))


def deliver(db: Session, contact: AlertContact, alert: Alert | None, subject: str, body: str, sms: str,
            sms_client: httpx.Client | None = None) -> list[dict]:
    results = []
    for channel, enabled, target in (("email", contact.notify_email, contact.email),
                                     ("sms", contact.notify_sms, contact.phone)):
        if not enabled or not target:
            continue
        try:
            if channel == "email":
                send_email(target, subject, body)
            else:
                send_sms(target, sms, sms_client)
            status, err = "sent", ""
        except NotConfigured as e:
            status, err = "skipped", str(e)
        except Exception as e:  # network / gateway errors must not stop the collector
            status, err = "failed", str(e)
        try:
            with db.begin_nested():
                _record(db, alert, contact, channel, target, status, err)
        except IntegrityError:
            continue  # already sent by a concurrent cycle
        results.append({"channel": channel, "target": target, "status": status, "error": err})
    return results


def contact_matches(contact: AlertContact, alert: Alert, alert_ancestors: list[int]) -> bool:
    return (contact.active and contact.location_id in alert_ancestors
            and SEVERITY_RANK.get(alert.severity, 0) >= SEVERITY_RANK.get(contact.min_severity, 1)
            and alert.device_type in (contact.device_types or ["camera", "nvr"]))


def dispatch(db: Session, now=None, sms_client: httpx.Client | None = None) -> int:
    """Send due notifications for unresolved alerts. Returns number of attempts made."""
    now = now or utcnow()
    alerts = db.scalars(select(Alert).where(Alert.status != "resolved", Alert.opened_at >= now - timedelta(days=2))).all()
    if not alerts:
        return 0
    contacts = db.scalars(select(AlertContact).where(AlertContact.active.is_(True))).all()
    if not contacts:
        return 0
    done = {(a, c, ch) for a, c, ch in db.execute(select(NotificationLog.alert_id, NotificationLog.contact_id,
                                                          NotificationLog.channel).where(
        NotificationLog.alert_id.in_([a.id for a in alerts])))}
    trees: dict[int, dict] = {}
    attempts = 0
    for alert in alerts:
        model = Camera if alert.device_type == "camera" else NVR
        dev = db.get(model, alert.device_id)
        org_id = dev.location.org_id if dev and dev.location else None
        if org_id is None:
            continue
        tree = trees.setdefault(org_id, location_tree(db, org_id))
        anc = ancestors(tree, alert.location_id)
        path = location_path(tree, alert.location_id)
        subject, body, sms = alert_text(alert, path)
        for c in contacts:
            if not contact_matches(c, alert, anc):
                continue
            if c.escalation_delay_min:
                if alert.status != "open" or now - alert.opened_at < timedelta(minutes=c.escalation_delay_min):
                    continue
                subj = "[ESCALATION] " + subject
            else:
                subj = subject
            pending = [ch for ch, en, tgt in (("email", c.notify_email, c.email), ("sms", c.notify_sms, c.phone))
                       if en and tgt and (alert.id, c.id, ch) not in done]
            if not pending:
                continue
            res = deliver(db, c, alert, subj, body, sms, sms_client)
            attempts += len(res)
            for r in res:
                done.add((alert.id, c.id, r["channel"]))
    db.commit()
    return attempts
