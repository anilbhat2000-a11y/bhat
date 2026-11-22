from datetime import datetime, timedelta

from sqlalchemy import select

from sentinel.db import Base, SessionLocal, engine
from sentinel.health import alerts
from sentinel.models import Alert, AlertRule, Location, Organization


def setup_module():
    Base.metadata.create_all(engine)


def _rule(db, **kw):
    r = AlertRule(name=kw.get("name", "Offline"), device_type="camera", metric=kw.get("metric", "online"),
                  op=kw.get("op", "=="), threshold=kw.get("threshold", 0), duration_s=kw.get("duration_s", 300),
                  severity="critical")
    db.add(r)
    db.flush()
    return r


def test_duration_then_auto_resolve():
    with SessionLocal() as db:
        org = Organization(name="AlertOrg", code="ALRT")
        db.add(org)
        db.flush()
        location = Location(name="AlertSite", org_id=org.id)
        db.add(location)
        db.flush()
        # isolate: disable any pre-existing rules
        for r in db.scalars(select(AlertRule)):
            r.enabled = False
        rule = _rule(db)
        t0 = datetime(2026, 1, 1, 12, 0, 0)
        assert alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 0.0}, t0) == []
        assert alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 0.0}, t0 + timedelta(seconds=299)) == []
        opened = alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 0.0}, t0 + timedelta(seconds=300))
        assert len(opened) == 1 and "Cam99" in opened[0].message
        # no duplicate while still breached
        assert alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 0.0}, t0 + timedelta(seconds=400)) == []
        # missing metric: nothing changes
        alerts.evaluate(db, "camera", 99, location.id, "Cam99", {}, t0 + timedelta(seconds=450))
        a = db.scalar(select(Alert).where(Alert.rule_id == rule.id))
        assert a.status == "open"
        alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 1.0}, t0 + timedelta(seconds=500))
        assert a.status == "resolved" and a.resolved_at is not None
        # a short blip below duration never opens an alert
        alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 0.0}, t0 + timedelta(seconds=600))
        alerts.evaluate(db, "camera", 99, location.id, "Cam99", {"online": 1.0}, t0 + timedelta(seconds=650))
        assert len(db.scalars(select(Alert).where(Alert.rule_id == rule.id)).all()) == 1
        db.rollback()


def test_derived_metrics():
    m = alerts.derived_metrics({"fps": 12.5, "target_fps": 25, "time_drift_s": -40, "blurred": True, "codec": "h264"}, True)
    assert m["online"] == 1.0 and m["fps_ratio"] == 0.5 and m["abs_time_drift_s"] == 40 and m["blurred"] == 1.0
    assert "codec" not in m
    assert alerts.derived_metrics({}, False) == {"online": 0.0}
