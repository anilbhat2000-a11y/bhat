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

    def __post_init__(self) -> None:
        if not self.secret_key:
            # Dev convenience only: tokens and stored device passwords will not
            # survive a restart. Production must set SC_SECRET_KEY.
            warnings.warn("SC_SECRET_KEY not set; using a random key (dev only).", stacklevel=2)
            self.secret_key = secrets.token_urlsafe(48)


settings = Settings()
