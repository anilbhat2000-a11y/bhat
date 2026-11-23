"""Runtime configuration, read from environment variables (prefix SC_)."""
from __future__ import annotations

import os
import secrets
import warnings
from dataclasses import dataclass, field


def _bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


def _load_env_file() -> None:
    """Read visionops.env (created by the launcher) so a manual start uses the same
    settings. Values already set in the environment win."""
    from pathlib import Path
    for path in (Path.cwd() / "visionops.env", Path(__file__).resolve().parents[1] / "visionops.env"):
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            break


if os.getenv("SC_IGNORE_ENV_FILE") != "1":
    _load_env_file()


@dataclass
class Settings:
    database_url: str = field(default_factory=lambda: os.getenv("SC_DATABASE_URL", "sqlite:///./sentinel.db"))
    secret_key: str = field(default_factory=lambda: os.getenv("SC_SECRET_KEY", ""))
    token_minutes: int = field(default_factory=lambda: int(os.getenv("SC_TOKEN_MINUTES", "480")))
    collect_interval_s: int = field(default_factory=lambda: int(os.getenv("SC_COLLECT_INTERVAL", "30")))
    collector_enabled: bool = field(default_factory=lambda: _bool("SC_COLLECTOR", True))
    seed_demo: bool = field(default_factory=lambda: _bool("SC_SEED_DEMO", False))
    admin_password: str = field(default_factory=lambda: os.getenv("SC_ADMIN_PASSWORD", ""))
    metric_retention_days: int = field(default_factory=lambda: int(os.getenv("SC_METRIC_RETENTION_DAYS", "90")))
    probe_timeout_s: float = field(default_factory=lambda: float(os.getenv("SC_PROBE_TIMEOUT", "4")))
    cookie_secure: bool = field(default_factory=lambda: _bool("SC_COOKIE_SECURE", False))
    # Email alerts through your own (on-premise) mail server.
    smtp_host: str = field(default_factory=lambda: os.getenv("SC_SMTP_HOST", ""))
    smtp_port: int = field(default_factory=lambda: int(os.getenv("SC_SMTP_PORT") or "587"))
    smtp_user: str = field(default_factory=lambda: os.getenv("SC_SMTP_USER", ""))
    smtp_password: str = field(default_factory=lambda: os.getenv("SC_SMTP_PASSWORD", ""))
    smtp_from: str = field(default_factory=lambda: os.getenv("SC_SMTP_FROM") or "sentinel@localhost")
    smtp_starttls: bool = field(default_factory=lambda: _bool("SC_SMTP_STARTTLS", True))
    # SMS through any HTTP SMS gateway. {phone} and {message} are filled in (URL-encoded in the
    # URL, JSON-escaped in the body). Headers is a JSON object, e.g. {"authkey": "..."}.
    sms_url: str = field(default_factory=lambda: os.getenv("SC_SMS_URL", ""))
    sms_method: str = field(default_factory=lambda: (os.getenv("SC_SMS_METHOD") or "POST").upper())
    sms_body: str = field(default_factory=lambda: os.getenv("SC_SMS_BODY") or '{"to": "{phone}", "text": "{message}"}')
    sms_headers: str = field(default_factory=lambda: os.getenv("SC_SMS_HEADERS") or "{}")
    public_url: str = field(default_factory=lambda: os.getenv("SC_PUBLIC_URL", ""))
    # Log file with automatic rotation (5 files x 5 MB). Empty = log to the console only.
    log_file: str = field(default_factory=lambda: os.getenv("SC_LOG_FILE", ""))
    # Live view: how many browser streams the server converts at once, and for how long each.
    max_live_streams: int = field(default_factory=lambda: int(os.getenv("SC_MAX_LIVE_STREAMS") or "8"))
    live_max_minutes: int = field(default_factory=lambda: int(os.getenv("SC_LIVE_MAX_MINUTES") or "30"))
    # Map background tiles. Empty = no background (works fully offline). Use your own tile
    # server, or a provider whose maps meet your country's rules, e.g. https://tiles.example/{z}/{x}/{y}.png
    map_tile_url: str = field(default_factory=lambda: os.getenv("SC_MAP_TILE_URL", ""))
    map_attribution: str = field(default_factory=lambda: os.getenv("SC_MAP_ATTRIBUTION", ""))

    def __post_init__(self) -> None:
        if not self.secret_key:
            # Dev convenience only: tokens and stored device passwords will not
            # survive a restart. Production must set SC_SECRET_KEY.
            warnings.warn("SC_SECRET_KEY not set; using a random key (dev only).", stacklevel=2)
            self.secret_key = secrets.token_urlsafe(48)


settings = Settings()
