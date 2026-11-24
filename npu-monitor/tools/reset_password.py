"""Reset a user's password from the server console (e.g. a forgotten admin password).

Stop the app first, because it keeps users in memory and would overwrite the change:

    Linux service:   sudo systemctl stop 3cits-ai-pc
                     sudo -u 3cits .venv/bin/python tools/reset_password.py --user admin
                     sudo systemctl start 3cits-ai-pc
    Windows:         stop the app / startup task, then
                     .venv\\Scripts\\python tools\\reset_password.py --user admin

Options:
    --user NAME      account to reset (default: list accounts and ask)
    --create-admin   create NAME as a new administrator if it does not exist
The password is asked twice and never shown. The account is re-enabled and unlocked,
and the reset is written to the audit log.
"""
from __future__ import annotations

import argparse
import getpass
import os
import socket
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from npu_monitor.auth import AuthError, AuthStore, hash_password  # noqa: E402


def service_running(port: int = 8765) -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Reset a user's password (run on the server, app stopped)")
    ap.add_argument("--user", help="username to reset")
    ap.add_argument("--create-admin", action="store_true", help="create the user as an administrator if missing")
    ap.add_argument("--port", type=int, default=8765, help="port the app normally uses (to detect if it is running)")
    ap.add_argument("--force", action="store_true", help="continue even if the app seems to be running")
    a = ap.parse_args()

    if service_running(a.port) and not a.force:
        print(f"The app is still running on port {a.port}. Stop it first, otherwise it overwrites the change:\n"
              "  Linux:   sudo systemctl stop 3cits-ai-pc\n"
              "  Windows: close start.bat or Stop-ScheduledTask -TaskName '3C ITS AI PC Health Checker'\n"
              "(use --force to continue anyway)")
        return 1

    store = AuthStore()
    users_file = os.path.join(store.dir, "users.json")
    owner = os.stat(users_file).st_uid if os.path.exists(users_file) and hasattr(os, "getuid") else None
    if not store.users and not a.create_admin:
        print(f"No accounts exist yet ({users_file}). Open the app on this machine to create the first "
              "administrator, or re-run with --user NAME --create-admin.")
        return 1

    if store.users:
        print("Accounts:")
        for u in sorted(store.users.values(), key=lambda x: x["username"].lower()):
            print(f"  {u['username']:<20} {u['role']:<9} {'active' if u.get('active', True) else 'DISABLED'}")
    name = a.user or input("Username to reset: ").strip()
    match = next((k for k in store.users if k.lower() == name.lower()), None)
    if match is None and not a.create_admin:
        print(f"No account named '{name}'. Use --create-admin to create it as an administrator.")
        return 1

    pw = getpass.getpass(f"New password for {name}: ")
    if pw != getpass.getpass("Repeat the new password: "):
        print("The passwords do not match. Nothing was changed.")
        return 1
    try:
        store._check_password(pw)
        if match is None:
            store.create_user(name, pw, "admin")
            action = "created as administrator"
        else:
            u = store.users[match]
            was_disabled = not u.get("active", True)
            u["password"] = hash_password(pw)
            u["active"] = True
            u["must_change_password"] = False
            store._write("users.json", store.users)
            action = "password reset" + (" (account re-enabled)" if was_disabled else "")
    except AuthError as e:
        print(f"Not accepted: {e}. Nothing was changed.")
        return 1

    who = os.environ.get("SUDO_USER") or getpass.getuser()
    store.audit(f"console:{who}", "password_reset_console", f"{match or name}: {action}", socket.gethostname())
    # Running as root would leave the files owned by root; give them back to the service account.
    if owner is not None and hasattr(os, "geteuid") and os.geteuid() == 0 and owner != 0:
        for f in ("users.json", "audit.jsonl"):
            p = os.path.join(store.dir, f)
            if os.path.exists(p):
                os.chown(p, owner, -1)
    print(f"Done: {match or name} - {action}. Start the app again and sign in.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nCancelled. Nothing was changed.")
        sys.exit(1)
