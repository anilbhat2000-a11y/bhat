"""Authentication, role-based access control, site scoping and secret storage."""
from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User

COOKIE_NAME = "sc_token"
ALGO = "HS256"

# Permission matrix. Keep this the single source of truth for authorization.
PERMISSIONS: dict[str, set[str]] = {
    "super_admin": {"view", "ack", "manage_devices", "manage_rules", "manage_users", "view_audit", "manage_edge"},
    "site_admin": {"view", "ack", "manage_devices"},
    "operator": {"view", "ack"},
    "viewer": {"view"},
    "auditor": {"view", "view_audit"},
}
ALL_SITES_ROLES = {"super_admin", "auditor"}


# ---- passwords -------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode()[:72], hashed.encode())
    except ValueError:
        return False


# ---- device credential encryption -----------------------------------------
def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(("device-creds:" + settings.secret_key).encode()).digest())
    return Fernet(key)


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode() if plain else ""


def decrypt_secret(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return ""  # key rotated / dev random key: credential must be re-entered


# ---- tokens ----------------------------------------------------------------
def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id), "role": user.role, "iat": now, "exp": now + timedelta(minutes=settings.token_minutes)}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGO)


def _token_from_request(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(COOKIE_NAME)


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _token_from_request(request)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User disabled")
    return user


def can(user: User, perm: str) -> bool:
    return perm in PERMISSIONS.get(user.role, set())


def require(perm: str):
    def dep(user: User = Depends(current_user)) -> User:
        if not can(user, perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {perm}")
        return user
    return dep


def allowed_site_ids(user: User) -> set[int] | None:
    """None means every site."""
    if user.role in ALL_SITES_ROLES:
        return None
    return {s.id for s in user.sites}


def check_site(user: User, site_id: int) -> None:
    ids = allowed_site_ids(user)
    if ids is not None and site_id not in ids:
        # 404 rather than 403 so out-of-scope devices are not disclosed.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


def scope_filter(query, column, user: User):
    ids = allowed_site_ids(user)
    if ids is None:
        return query
    return query.where(column.in_(ids or {-1}))
