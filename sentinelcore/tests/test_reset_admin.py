import io

from sqlalchemy import select

from sentinel import reset_admin
from sentinel.db import Base, SessionLocal, engine
from sentinel.models import User
from sentinel.security import hash_password, verify_password


def _make(name):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(User(username=name, full_name="Boss", role="super_admin", active=False, password_hash=hash_password("Old@12345")))
        db.commit()


def test_reset_username_and_password(monkeypatch, capsys):
    _make("boss1")
    monkeypatch.setattr(reset_admin, "SERVICE_ENV", reset_admin.Path("/nonexistent/sentinelcore.env"))
    monkeypatch.setattr("sys.stdin", io.StringIO("New@Pass2026\n"))
    assert reset_admin.main(["--user", "boss1", "--username", "chief", "--password-stdin"]) == 0
    with SessionLocal() as db:
        u = db.scalar(select(User).where(User.username == "chief"))
        assert u and u.active and verify_password("New@Pass2026", u.password_hash)
        assert not db.scalar(select(User).where(User.username == "boss1"))
    assert "Sign in as 'chief'" in capsys.readouterr().out


def test_reset_refuses_short_password_and_taken_name(monkeypatch):
    _make("boss2")
    _make("taken.name")
    monkeypatch.setattr("sys.stdin", io.StringIO("short\n"))
    assert reset_admin.main(["--user", "boss2", "--username", "boss2", "--password-stdin"]) == 1
    monkeypatch.setattr("sys.stdin", io.StringIO("Long@Enough1\n"))
    assert reset_admin.main(["--user", "boss2", "--username", "taken.name", "--password-stdin"]) == 1   # name taken
    assert reset_admin.main(["--user", "nobody", "--password-stdin"]) == 1
    with SessionLocal() as db:
        assert verify_password("Old@12345", db.scalar(select(User).where(User.username == "boss2")).password_hash)
