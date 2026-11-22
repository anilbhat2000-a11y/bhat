"""Database models.

Device hierarchy: Site -> (Building / Floor / Zone as camera attributes) -> Camera.
Cameras may hang off an NVR channel or be standalone.
Health is stored twice: the latest snapshot per device (DeviceState) and a
time series of numeric metrics (HealthMetric) for charts and alert history.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


ROLES = ("super_admin", "site_admin", "operator", "viewer", "auditor")
POWER_TYPES = ("poe", "mains", "battery", "solar")
DEVICE_TYPES = ("camera", "nvr")


class Site(Base):
    __tablename__ = "sites"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    city: Mapped[str] = mapped_column(String(120), default="")
    address: Mapped[str] = mapped_column(String(255), default="")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    full_name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    sites: Mapped[list[Site]] = relationship(secondary="user_sites", lazy="selectin")


class UserSite(Base):
    __tablename__ = "user_sites"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), primary_key=True)


class NVR(Base):
    __tablename__ = "nvrs"
    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120))
    vendor: Mapped[str] = mapped_column(String(40), default="generic")
    model: Mapped[str] = mapped_column(String(80), default="")
    host: Mapped[str] = mapped_column(String(255))
    http_port: Mapped[int] = mapped_column(Integer, default=80)
    rtsp_port: Mapped[int] = mapped_column(Integer, default=554)
    username: Mapped[str] = mapped_column(String(80), default="")
    password_enc: Mapped[str] = mapped_column(Text, default="")
    channels: Mapped[int] = mapped_column(Integer, default=16)
    driver: Mapped[str] = mapped_column(String(40), default="tcp")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    site: Mapped[Site] = relationship(lazy="joined")


class Camera(Base):
    __tablename__ = "cameras"
    __table_args__ = (UniqueConstraint("nvr_id", "channel", name="uq_nvr_channel"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="RESTRICT"))
    nvr_id: Mapped[int | None] = mapped_column(ForeignKey("nvrs.id", ondelete="SET NULL"), nullable=True)
    channel: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    vendor: Mapped[str] = mapped_column(String(40), default="generic")
    model: Mapped[str] = mapped_column(String(80), default="")
    host: Mapped[str] = mapped_column(String(255), default="")
    onvif_port: Mapped[int] = mapped_column(Integer, default=80)
    rtsp_url: Mapped[str] = mapped_column(String(500), default="")
    sub_stream_url: Mapped[str] = mapped_column(String(500), default="")
    username: Mapped[str] = mapped_column(String(80), default="")
    password_enc: Mapped[str] = mapped_column(Text, default="")
    power_type: Mapped[str] = mapped_column(String(20), default="poe")
    driver: Mapped[str] = mapped_column(String(40), default="generic")
    building: Mapped[str] = mapped_column(String(80), default="")
    floor: Mapped[str] = mapped_column(String(40), default="")
    zone: Mapped[str] = mapped_column(String(80), default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    target_fps: Mapped[float] = mapped_column(Float, default=25.0)
    analytics: Mapped[list] = mapped_column(JSON, default=list)  # list of analytic configs
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    site: Mapped[Site] = relationship(lazy="joined")
    nvr: Mapped[NVR | None] = relationship(lazy="joined")


class DeviceState(Base):
    """Latest health snapshot for a device. `data` holds only values the device
    actually reported; a missing key means "not supported / not reported"."""
    __tablename__ = "device_state"
    device_type: Mapped[str] = mapped_column(String(10), primary_key=True)
    device_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_checked: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class HealthMetric(Base):
    __tablename__ = "health_metrics"
    __table_args__ = (Index("ix_metric_dev_ts", "device_type", "device_id", "key", "ts"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    device_type: Mapped[str] = mapped_column(String(10))
    device_id: Mapped[int] = mapped_column(Integer)
    key: Mapped[str] = mapped_column(String(40))
    value: Mapped[float] = mapped_column(Float)


class AlertRule(Base):
    __tablename__ = "alert_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    device_type: Mapped[str] = mapped_column(String(10))
    metric: Mapped[str] = mapped_column(String(40))
    op: Mapped[str] = mapped_column(String(4))  # <, <=, >, >=, ==, !=
    threshold: Mapped[float] = mapped_column(Float)
    duration_s: Mapped[int] = mapped_column(Integer, default=0)
    severity: Mapped[str] = mapped_column(String(10), default="warning")  # info|warning|critical
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class RuleBreach(Base):
    """Tracks since when a rule has been continuously breached for a device."""
    __tablename__ = "rule_breaches"
    rule_id: Mapped[int] = mapped_column(ForeignKey("alert_rules.id", ondelete="CASCADE"), primary_key=True)
    device_type: Mapped[str] = mapped_column(String(10), primary_key=True)
    device_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    since: Mapped[datetime] = mapped_column(DateTime)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    rule_id: Mapped[int | None] = mapped_column(ForeignKey("alert_rules.id", ondelete="SET NULL"), nullable=True)
    device_type: Mapped[str] = mapped_column(String(10))
    device_id: Mapped[int] = mapped_column(Integer)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    severity: Mapped[str] = mapped_column(String(10))
    message: Mapped[str] = mapped_column(String(300))
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(12), default="open", index=True)  # open|acknowledged|resolved
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    acknowledged_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


EVENT_STATUSES = ("new", "acknowledged", "true_alarm", "false_alarm")


class Event(Base):
    """An AI analytics event (intrusion, loitering, ANPR read, ...)."""
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id", ondelete="CASCADE"), index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(40), index=True)
    object_class: Mapped[str] = mapped_column(String(40), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    zone: Mapped[str] = mapped_column(String(80), default="")
    source: Mapped[str] = mapped_column(String(20), default="server")  # edge|server
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    snapshot_url: Mapped[str] = mapped_column(String(500), default="")
    clip_url: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(14), default="new", index=True)
    handled_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    handled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class EdgeDevice(Base):
    """An edge AI box (Jetson / NUC / AI camera) allowed to push events."""
    __tablename__ = "edge_devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"))
    api_key_hash: Mapped[str] = mapped_column(String(200))
    key_prefix: Mapped[str] = mapped_column(String(12), index=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    username: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str] = mapped_column(String(120), default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str] = mapped_column(String(64), default="")
