from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import audit
from ..config import settings
from ..db import get_db
from ..models import User
from ..security import COOKIE_NAME, PERMISSIONS, create_token, current_user, hash_password, verify_password
from .serializers import user_dict

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-process brute-force throttle: 5 failures per username+IP per 5 min.
_fails: dict[str, list[float]] = defaultdict(list)
WINDOW, MAX_FAILS = 300, 5


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    key = f"{body.username.lower()}|{request.client.host if request.client else ''}"
    now = time.time()
    _fails[key] = [t for t in _fails[key] if now - t < WINDOW]
    if len(_fails[key]) >= MAX_FAILS:
        raise HTTPException(429, "Too many failed attempts. Try again in a few minutes.")
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not user.active or not verify_password(body.password, user.password_hash):
        _fails[key].append(now)
        audit(db, body.username, "login_failed", request=request)
        raise HTTPException(401, "Invalid username or password")
    _fails.pop(key, None)
    token = create_token(user)
    response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="strict", secure=settings.cookie_secure,
                        max_age=settings.token_minutes * 60, path="/")
    audit(db, user.username, "login", request=request, org_id=user.org_id)
    return {"token": token, "user": me_payload(user, db)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


def me_payload(user: User, db: Session | None = None) -> dict:
    paths = {}
    if db is not None and user.org_id:
        from ..security import location_path, location_tree
        tree = location_tree(db, user.org_id)
        paths = {lid: location_path(tree, lid) for lid in tree}
    return {**user_dict(user, paths), "permissions": sorted(PERMISSIONS.get(user.role, set()))}


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return me_payload(user, db)


class PasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/password")
def change_password(body: PasswordIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is wrong")
    if len(body.new_password) < 10:
        raise HTTPException(400, "New password must be at least 10 characters")
    user.password_hash = hash_password(body.new_password)
    db.add(user)
    audit(db, user.username, "password_changed", request=request, org_id=user.org_id)
    return {"ok": True}
