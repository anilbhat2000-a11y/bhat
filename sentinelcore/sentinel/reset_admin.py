"""Reset the platform administrator's username and/or password from the server.

    Ubuntu server:  cd /opt/bhat/sentinelcore && sudo .venv/bin/python -m sentinel.reset_admin
    Windows:        cd <folder>\\sentinelcore  then  python -m sentinel.reset_admin

Asks for the new username and password (nothing is shown while you type the password).
Options: --user NAME (account to change; default: the first super admin),
         --username NEW, --password-stdin (read the new password from standard input).

On a server it reads /etc/sentinelcore.env (the service settings) and runs as the owner
of the database file, so the running service can keep writing to it.
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys
from pathlib import Path

SERVICE_ENV = Path("/etc/sentinelcore.env")
MIN_LEN = 8


def load_service_env(path: Path = SERVICE_ENV) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def run_as_db_owner() -> None:
    """When started as root, switch to the user that owns the SQLite file (e.g. 'sentinel')."""
    if not hasattr(os, "geteuid") or os.geteuid() != 0:
        return
    url = os.environ.get("SC_DATABASE_URL", "sqlite:///./sentinel.db")
    if not url.startswith("sqlite:///"):
        return
    db = Path(url[len("sqlite:///"):])
    target = db if db.exists() else db.parent
    try:
        st = target.stat()
    except OSError:
        return
    if st.st_uid != 0:
        os.setgid(st.st_gid)
        os.setuid(st.st_uid)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m sentinel.reset_admin",
                                 description="Reset the VisionOps administrator's username and password.")
    ap.add_argument("--user", help="account to change (default: the first super admin)")
    ap.add_argument("--username", help="new username (default: ask; Enter keeps the current one)")
    ap.add_argument("--password-stdin", action="store_true", help="read the new password from standard input")
    a = ap.parse_args(argv)

    load_service_env()
    run_as_db_owner()

    from sqlalchemy import select

    from .audit import audit
    from .db import SessionLocal
    from .models import Base, User
    from .db import engine
    from .security import hash_password

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if a.user:
            user = db.scalar(select(User).where(User.username == a.user))
            if not user:
                print(f"No user called '{a.user}'.")
                return 1
        else:
            user = db.scalar(select(User).where(User.role == "super_admin").order_by(User.id))
            if not user:
                print("There is no administrator yet. Start VisionOps once to create it, then run this again.")
                return 1
        old = user.username
        print(f"Changing the administrator account '{old}'.")

        new_name = a.username
        if new_name is None:
            new_name = input(f"New username [press Enter to keep '{old}']: ").strip() or old
        new_name = new_name.strip()
        if not new_name or len(new_name) > 80 or any(c.isspace() for c in new_name):
            print("The username must be 1-80 characters with no spaces.")
            return 1
        if new_name != old and db.scalar(select(User.id).where(User.username == new_name)):
            print(f"The username '{new_name}' is already used by another account.")
            return 1

        if a.password_stdin:
            pw = sys.stdin.readline().rstrip("\r\n")
        else:
            while True:
                pw = getpass.getpass(f"New password ({MIN_LEN}+ characters): ")
                if pw != getpass.getpass("Type it again: "):
                    print("They do not match, try again.")
                    continue
                break
        if len(pw) < MIN_LEN:
            print(f"Use at least {MIN_LEN} characters.")
            return 1

        user.username = new_name
        user.password_hash = hash_password(pw)
        user.active = True
        audit(db, new_name, "admin_reset_from_server", target=f"user:{user.id}",
              details={"old_username": old, "new_username": new_name}, commit=False)
        db.commit()
    print(f"Done. Sign in as '{new_name}' with the new password.")
    print("If sign-in was blocked after wrong attempts, restart VisionOps to clear it"
          " (Ubuntu: sudo systemctl restart sentinelcore).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
