from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditLog


def audit(db: Session, username: str, action: str, target: str = "", details: dict | None = None,
          request: Request | None = None, commit: bool = True,
          org_id: int | None = None) -> None:
    ip = ""
    if request is not None and request.client:
        ip = request.client.host
    db.add(AuditLog(username=username, org_id=org_id, action=action, target=target, details=details or {}, ip=ip))
    if commit:
        db.commit()
