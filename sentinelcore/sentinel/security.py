"""Authentication, role-based access control, location scoping and secret storage."""
from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User

COOKIE_NAME = "sc_token"
ALGO = "HS256"

# Permission matrix. Keep this the single source of truth for authorization.
PERMISSIONS: dict[str, set[str]] = {
    "super_admin": {"view", "ack", "manage_devices", "manage_rules", "manage_users", "view_audit", "manage_edge",
                    "manage_orgs", "manage_locations", "manage_contacts", "approve", "reboot", "troubleshoot"},
    "org_admin": {"view", "ack", "manage_devices", "manage_users", "view_audit", "manage_edge", "manage_locations",
                  "manage_contacts", "approve", "reboot", "troubleshoot"},
    "location_admin": {"view", "ack", "manage_devices", "manage_users", "manage_locations", "manage_contacts", "approve",
                       "reboot", "troubleshoot"},
    "operator": {"view", "ack"},
    "viewer": {"view"},
    "auditor": {"view", "view_audit"},
}
# Roles whose scope is their whole organization (or every organization for platform users).
ORG_WIDE_ROLES = {"super_admin", "org_admin", "auditor"}


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


def location_tree(db: Session, org_id: int | None = None) -> dict[int, "Location"]:
    from .models import Location
    q = select(Location)
    if org_id is not None:
        q = q.where(Location.org_id == org_id)
    return {loc.id: loc for loc in db.scalars(q)}


def descendants(tree: dict, roots: set[int]) -> set[int]:
    children: dict[int, list[int]] = {}
    for loc in tree.values():
        if loc.parent_id is not None:
            children.setdefault(loc.parent_id, []).append(loc.id)
    out, stack = set(), [r for r in roots if r in tree]
    while stack:
        n = stack.pop()
        if n in out:
            continue
        out.add(n)
        stack.extend(children.get(n, []))
    return out


def ancestors(tree: dict, loc_id: int) -> list[int]:
    """Self first, then parent, grandparent... up to the root."""
    out, cur, seen = [], tree.get(loc_id), set()
    while cur is not None and cur.id not in seen:
        out.append(cur.id)
        seen.add(cur.id)
        cur = tree.get(cur.parent_id) if cur.parent_id is not None else None
    return out


def location_path(tree: dict, loc_id: int) -> str:
    return " / ".join(tree[i].name for i in reversed(ancestors(tree, loc_id)))


BRANCH_KINDS = ("branch", "office", "warehouse", "store", "plant", "corporate")


def branch_of(tree: dict, loc_id: int) -> int | None:
    """Nearest ancestor-or-self that is a branch-like site (branch, office, store, ...)."""
    for i in ancestors(tree, loc_id):
        if tree[i].kind in BRANCH_KINDS:
            return i
    chain = ancestors(tree, loc_id)
    return chain[-1] if chain else None


def allowed_location_ids(db: Session, user: User) -> set[int] | None:
    """Location ids the user may see. None means every location (platform users only).
    Org-wide roles see their whole organization; everyone else sees the subtree under
    each location they are assigned to."""
    cached = getattr(user, "_scope_cache", "unset")
    if cached != "unset":
        return cached
    if user.org_id is None and user.role in ORG_WIDE_ROLES:
        ids = None
    elif user.org_id is None:
        ids = set()  # misconfigured: non-platform role without organization sees nothing
    else:
        tree = location_tree(db, user.org_id)
        if user.role in ORG_WIDE_ROLES:
            ids = set(tree)
        else:
            ids = descendants(tree, {loc.id for loc in user.locations if loc.org_id == user.org_id})
    user._scope_cache = ids
    return ids


def covers(db: Session, user: User, location_id: int) -> bool:
    ids = allowed_location_ids(db, user)
    return ids is None or location_id in ids


def check_location(db: Session, user: User, location_id: int) -> None:
    if not covers(db, user, location_id):
        # 404 rather than 403 so out-of-scope devices are not disclosed.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


def scope_filter(db: Session, query, column, user: User):
    ids = allowed_location_ids(db, user)
    if ids is None:
        return query
    return query.where(column.in_(ids or {-1}))


def can_assign_role(actor: User, role: str) -> bool:
    """Users may only hand out roles below their own (super admin may do anything)."""
    from .models import ROLE_RANK
    if actor.role == "super_admin":
        return True
    return ROLE_RANK.get(role, 999) < ROLE_RANK.get(actor.role, 0)
