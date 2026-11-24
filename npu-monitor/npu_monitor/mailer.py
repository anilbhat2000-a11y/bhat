"""Send email through the office SMTP server configured in Admin panel > Security."""
from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage


def send(smtp: dict, to: str, subject: str, text: str, html: str | None = None, timeout: float = 15) -> None:
    host = smtp.get("host")
    if not host or not smtp.get("from_addr"):
        raise RuntimeError("email is not configured (Admin panel > Security > Email)")
    mode = smtp.get("security") or "starttls"
    port = int(smtp.get("port") or (465 if mode == "ssl" else 587 if mode == "starttls" else 25))
    msg = EmailMessage()
    msg["From"] = smtp["from_addr"]
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    ctx = ssl.create_default_context()
    if mode == "ssl":
        server = smtplib.SMTP_SSL(host, port, timeout=timeout, context=ctx)
    else:
        server = smtplib.SMTP(host, port, timeout=timeout)
    try:
        server.ehlo()
        if mode == "starttls":
            server.starttls(context=ctx)
            server.ehlo()
        if smtp.get("username"):
            server.login(smtp["username"], smtp.get("password") or "")
        server.send_message(msg)
    finally:
        try:
            server.quit()
        except Exception:
            pass
