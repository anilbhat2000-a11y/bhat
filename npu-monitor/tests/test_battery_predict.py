import time
from datetime import date, timedelta

from npu_monitor import alerts, predict
from npu_monitor.telemetry.battery import BatteryProbe


def _fake_bat(tmp_path, **vals):
    d = tmp_path / "BAT0"
    d.mkdir()
    for k, v in vals.items():
        (d / k).write_text(str(v))
    return str(d)


def test_linux_battery_health_and_power(tmp_path, monkeypatch):
    path = _fake_bat(tmp_path, status="Discharging", energy_full_design=60_000_000, energy_full=51_000_000,
                     energy_now=25_500_000, power_now=12_000_000, cycle_count=320, voltage_now=11_800_000)
    p = BatteryProbe()
    p._linux = [path]
    monkeypatch.setattr("psutil.sensors_battery", lambda: None)
    b = p.sample()
    assert b["present"] and b["health_pct"] == 85.0 and b["cycles"] == 320
    assert b["power_w"] == 12.0 and b["percent"] == 50.0 and b["full_wh"] == 51.0


def _s(ts, pct, plugged=False, power=10.0, now_wh=30.0):
    return {"ts": ts, "battery": {"present": True, "percent": pct, "plugged": plugged, "status": "Discharging",
                                  "power_w": power, "now_wh": now_wh, "full_wh": 50.0, "os_secs_left": None}}


def test_runtime_trend_and_power():
    t0 = 1000.0
    samples = [_s(t0 + i * 10, 60 - i * 0.05) for i in range(40)]  # -0.3 %/min
    r = predict.runtime(samples)
    assert r["empty_by_power_min"] == 180          # 30 Wh / 10 W
    assert abs(r["empty_by_trend_min"] - 193) <= 2  # 58 % / 0.3 %/min
    assert r["empty_min"] == r["empty_by_trend_min"]


def test_health_forecast_from_cycles_and_from_log():
    f = predict.health_forecast({"present": True, "health_pct": 90.0, "cycles": 200}, log=[])
    assert f["wear_pct_per_cycle"] == 0.05 and f["days_to_80"] == round(10 / 0.05 / 0.6)
    today = date.today()
    log = [{"date": (today - timedelta(days=30 - i)).isoformat(), "health_pct": 92 - i * 0.01, "cycles": 100 + i}
           for i in range(31)]
    f2 = predict.health_forecast({"present": True, "health_pct": 91.7, "cycles": 130}, log=log)
    assert "trend" in f2["method"] and f2["cycles_per_day"] == 1.0
    assert abs(f2["days_to_80"] - round(11.7 / 0.01)) <= 2


def _report():
    run = lambda kind, ips, cpu, gpu, w: {"device": kind, "kind": kind, "label": kind, "ips": ips,
                                          "latency_mean_ms": 1000 / ips, "latency_p95_ms": 1200 / ips,
                                          "during": {"cpu": cpu, "gpu": gpu, "power_w": w, "npu": 0}}
    return {"metrics": {"power_source": "battery"}, "battery": {"full_wh": 50.0}, "benchmark": {
        "baseline": {"cpu": 5.0, "gpu": 2.0, "power_w": 6.0},
        "results": [run("npu", 300, 8, 2, 9.0), run("gpu", 400, 15, 90, 26.0), run("cpu", 60, 95, 2, 36.0)]}}


def test_workload_model_and_lifespan():
    m = predict.workload_model(_report(), None, rate=30, hours_per_day=4)
    rows = {r["kind"]: r for r in m["rows"]}
    assert rows["npu"]["busy_pct"] == 10.0 and rows["npu"]["power_w"] == 6.3 and rows["cpu"]["cpu_pct"] == 50.0
    assert rows["npu"]["battery_h"] > rows["cpu"]["battery_h"]
    assert any("CPU load drops" in f for f in m["findings"]) and any("battery life with this workload" in f for f in m["findings"])
    f = predict.health_forecast({"present": True, "health_pct": 95.0, "cycles": 100}, log=[])
    life = predict.npu_lifespan_benefit(f, m)
    assert life and life["extra_months"] > 0


def test_alerts_not_ai_pc_and_battery():
    hw = {"host": "old-pc", "cpu": "Intel Core i5-8250U", "ai_pc": {"is_ai_pc": False, "class": "Not an AI PC", "reason": "no NPU"}}
    latest = {"battery": {"present": True, "health_pct": 72, "plugged": False, "percent": 12}, "cpu": {"util": 10}, "npu": {"util": 0}}
    a = alerts.evaluate(hw, [], latest, [], {"empty_min": 25}, {"available": False})
    codes = [x["code"] for x in a]
    assert codes[0] == "not_ai_pc" and "battery_worn" in codes and "battery_low" in codes


def test_alert_ai_on_cpu_when_npu_available():
    hw = {"host": "h", "ai_pc": {"is_ai_pc": True, "class": "Copilot+ AI PC"}}
    recent = [{"inference": {"cpu": {"ips": 20}}, "cpu": {"util": 50}, "npu": {"util": 0}} for _ in range(10)]
    a = alerts.evaluate(hw, [{"kind": "npu"}], None, recent, {}, {"available": False})
    assert [x["code"] for x in a] == ["ai_on_cpu"]
