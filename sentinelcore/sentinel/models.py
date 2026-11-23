"""Database models.

Device hierarchy: Location -> (Building / Floor / Zone as camera attributes) -> Camera.
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


# Role ladder. super_admin = platform operator (all organizations).
ROLES = ("super_admin", "org_admin", "location_admin", "operator", "viewer", "auditor")
ROLE_RANK = {"super_admin": 100, "org_admin": 80, "location_admin": 60, "auditor": 30, "operator": 40, "viewer": 20}
POWER_TYPES = ("poe", "mains", "battery", "solar")
DEVICE_TYPES = ("camera", "nvr")
LOCATION_KINDS = ("corporate", "region", "zone", "branch", "office", "warehouse", "store", "plant",
                  "building", "floor", "area", "other")
SEVERITIES = ("info", "warning", "critical")
SEVERITY_RANK = {"info": 0, "warning": 1, "critical": 2}


class Organization(Base):
    """A customer organization (tenant). All of its locations, devices, users
    and alert contacts are isolated from other organizations."""
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # When on, device changes by location admins wait for approval from higher up the hierarchy.
    require_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    # Highest live-view quality its users may watch: low | moderate | high.
    live_quality: Mapped[str] = mapped_column(String(10), default="moderate")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Location(Base):
    """A named node in an organization's hierarchy, e.g.
    Corporate Office > West Region > Mumbai Andheri Branch > 2nd Floor > Server Room.
    Cameras and NVRs attach to any node; access granted on a node covers everything under it."""
    __tablename__ = "locations"
    __table_args__ = (UniqueConstraint("org_id", "parent_id", "name", name="uq_location_sibling_name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="RESTRICT"), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(20), default="branch")
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(40), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    org: Mapped[Organization] = relationship(lazy="joined")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    full_name: Mapped[str] = mapped_column(String(120), default="")
    designation: Mapped[str] = mapped_column(String(120), default="")
    org_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    locations: Mapped[list[Location]] = relationship(secondary="user_locations", lazy="selectin")
    org: Mapped[Organization | None] = relationship(lazy="joined")


class UserLocation(Base):
    __tablename__ = "user_locations"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True)


class AlertContact(Base):
    """A person who receives alert notifications for a location and everything under it."""
    __tablename__ = "alert_contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    designation: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    notify_email: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    min_severity: Mapped[str] = mapped_column(String(10), default="warning")
    device_types: Mapped[list] = mapped_column(JSON, default=lambda: ["camera", "nvr"])
    # 0 = notify as soon as the alert opens. N = escalation: notify only if the alert is
    # still unacknowledged N minutes after it opened.
    escalation_delay_min: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    location: Mapped[Location] = relationship(lazy="joined")


class NotificationLog(Base):
    __tablename__ = "notification_log"
    __table_args__ = (UniqueConstraint("alert_id", "contact_id", "channel", name="uq_notify_once"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    alert_id: Mapped[int | None] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), nullable=True)
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("alert_contacts.id", ondelete="SET NULL"), nullable=True)
    location_id: Mapped[int] = mapped_column(Integer, index=True)
    channel: Mapped[str] = mapped_column(String(10))  # email | sms
    target: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(10))  # sent | failed | skipped
    error: Mapped[str] = mapped_column(Text, default="")


class ChangeRequest(Base):
    """A device change waiting for approval (maker-checker)."""
    __tablename__ = "change_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    location_id: Mapped[int] = mapped_column(Integer, index=True)
    entity: Mapped[str] = mapped_column(String(20))   # camera | nvr | nvr_channels | camera_csv
    action: Mapped[str] = mapped_column(String(10))   # create | update | delete | import
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(String(300))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    requested_by: Mapped[str] = mapped_column(String(80))
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    status: Mapped[str] = mapped_column(String(10), default="pending", index=True)  # pending|approved|rejected|failed
    decided_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    decision_note: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[dict] = mapped_column(JSON, default=dict)


class NVR(Base):
    __tablename__ = "nvrs"
    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"))
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
    # Identity as reported by the device itself (ONVIF / ISAPI); filled in automatically.
    manufacturer: Mapped[str] = mapped_column(String(80), default="")
    serial_number: Mapped[str] = mapped_column(String(80), default="")
    firmware: Mapped[str] = mapped_column(String(80), default="")
    mac_address: Mapped[str] = mapped_column(String(32), default="")
    info_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    department: Mapped[str] = mapped_column(String(80), default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    location: Mapped[Location] = relationship(lazy="joined")


class Camera(Base):
    __tablename__ = "cameras"
    __table_args__ = (UniqueConstraint("nvr_id", "channel", name="uq_nvr_channel"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"))
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
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)   # optional; else the location's
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    live_quality: Mapped[str] = mapped_column(String(10), default="")    # "" = organization default
    # Identity as reported by the device itself (ONVIF / ISAPI); filled in automatically.
    manufacturer: Mapped[str] = mapped_column(String(80), default="")
    serial_number: Mapped[str] = mapped_column(String(80), default="")
    firmware: Mapped[str] = mapped_column(String(80), default="")
    mac_address: Mapped[str] = mapped_column(String(32), default="")
    info_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    department: Mapped[str] = mapped_column(String(80), default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    location: Mapped[Location] = relationship(lazy="joined")
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
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), index=True)
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
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), index=True)
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
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"))
    api_key_hash: Mapped[str] = mapped_column(String(200))
    key_prefix: Mapped[str] = mapped_column(String(12), index=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    username: Mapped[str] = mapped_column(String(80))
    org_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str] = mapped_column(String(120), default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str] = mapped_column(String(64), default="")


class UseCase(Base):
    """A use case in the catalog (built-in or imported)."""
    __tablename__ = "use_cases"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(60), unique=True)
    sector: Mapped[str] = mapped_column(String(30), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    capabilities: Mapped[list] = mapped_column(JSON, default=list)
    integrations: Mapped[list] = mapped_column(JSON, default=list)
    rule: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    severity: Mapped[str] = mapped_column(String(10), default="warning")
    builtin: Mapped[bool] = mapped_column(Boolean, default=True)


class PlatformCapability(Base):
    """Whether an AI model or an integration is installed on this platform."""
    __tablename__ = "platform_capabilities"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    kind: Mapped[str] = mapped_column(String(12))  # model | integration
    installed: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str] = mapped_column(String(300), default="")
    updated_by: Mapped[str] = mapped_column(String(80), default="")
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
