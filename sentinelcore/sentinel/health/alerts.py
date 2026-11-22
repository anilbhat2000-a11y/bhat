"""Health alert rule engine.

A rule fires when `metric <op> threshold` has been true continuously for at
least `duration_s`. It auto-resolves when the condition clears. If a device
does not report a metric, that rule is skipped (state is kept) — missing data
never opens or closes an alert.
"""
from __future__ import annotations

import operator
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Alert, AlertRule, RuleBreach, utcnow

OPS = {"<": operator.lt, "<=": operator.le, ">": operator.gt, ">=": operator.ge,
       "==": operator.eq, "!=": operator.ne}

DEFAULT_RULES = [
    # name, device_type, metric, op, threshold, duration_s, severity
    ("Camera offline > 5 min", "camera", "online", "==", 0, 300, "critical"),
    ("Low FPS (< 60% of target) > 5 min", "camera", "fps_ratio", "<", 0.6, 300, "warning"),
    ("Battery below 20%", "camera", "battery_pct", "<", 20, 0, "warning"),
    ("Battery critical below 10%", "camera", "battery_pct", "<", 10, 0, "critical"),
    ("Camera view changed / tampered", "camera", "view_changed", "==", 1, 0, "critical"),
    ("Image blurred > 10 min", "camera", "blurred", "==", 1, 600, "warning"),
    ("Image blank / covered", "camera", "blank", "==", 1, 60, "critical"),
    ("Video frozen > 2 min", "camera", "frozen", "==", 1, 120, "critical"),
    ("Camera clock drift > 30 s", "camera", "abs_time_drift_s", ">", 30, 0, "info"),
    ("NVR offline > 5 min", "nvr", "online", "==", 0, 300, "critical"),
    ("NVR disk error", "nvr", "disk_errors", ">", 0, 0, "critical"),
    ("NVR storage > 95%", "nvr", "storage_used_pct", ">", 95, 900, "warning"),
    ("NVR retention < 7 days", "nvr", "retention_days", "<", 7, 0, "warning"),
    ("NVR temperature > 60°C", "nvr", "temp_c", ">", 60, 600, "warning"),
]


def seed_default_rules(db: Session) -> None:
    if db.scalar(select(AlertRule.id).limit(1)) is not None:
        return
    for name, dt, metric, op, thr, dur, sev in DEFAULT_RULES:
        db.add(AlertRule(name=name, device_type=dt, metric=metric, op=op, threshold=thr, duration_s=dur, severity=sev))
    db.commit()


def derived_metrics(data: dict, online: bool) -> dict[str, float]:
    """Numeric metrics used for time series and rules, including derived ones."""
    out: dict[str, float] = {"online": 1.0 if online else 0.0}
    for k, v in data.items():
        if isinstance(v, bool):
            out[k] = 1.0 if v else 0.0
        elif isinstance(v, (int, float)):
            out[k] = float(v)
    if "fps" in out and out.get("target_fps"):
        out["fps_ratio"] = round(out["fps"] / out["target_fps"], 3)
    if "time_drift_s" in out:
        out["abs_time_drift_s"] = abs(out["time_drift_s"])
    return out


def evaluate(db: Session, device_type: str, device_id: int, location_id: int, device_name: str,
             values: dict[str, float], now: datetime | None = None) -> list[Alert]:
    """Evaluate all enabled rules for one device. Returns newly opened alerts.
    Caller commits."""
    now = now or utcnow()
    opened: list[Alert] = []
    rules = db.scalars(select(AlertRule).where(AlertRule.enabled.is_(True), AlertRule.device_type == device_type)).all()
    for rule in rules:
        if rule.metric not in values:
            continue
        breached = OPS[rule.op](values[rule.metric], rule.threshold)
        key = (rule.id, device_type, device_id)
        breach = db.get(RuleBreach, key)
        active = db.scalar(select(Alert).where(Alert.rule_id == rule.id, Alert.device_type == device_type,
                                               Alert.device_id == device_id, Alert.status != "resolved"))
        if breached:
            if breach is None:
                breach = RuleBreach(rule_id=rule.id, device_type=device_type, device_id=device_id, since=now)
                db.add(breach)
            if active is None and now - breach.since >= timedelta(seconds=rule.duration_s):
                alert = Alert(rule_id=rule.id, device_type=device_type, device_id=device_id, location_id=location_id,
                              severity=rule.severity, value=values[rule.metric], opened_at=now,
                              message=f"{device_name}: {rule.name} (value {values[rule.metric]:g})")
                db.add(alert)
                opened.append(alert)
        else:
            if breach is not None:
                db.delete(breach)
            if active is not None:
                active.status = "resolved"
                active.resolved_at = now
    db.flush()
    return opened
