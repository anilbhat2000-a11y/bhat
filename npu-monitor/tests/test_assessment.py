import pytest

from npu_monitor.assessment import assess, compare
from npu_monitor.hwinfo import rated_npu


def _run(kind, ips, lat, cpu, gpu=1.0, power=None, label=None):
    return {"device": f"x:{kind}", "kind": kind, "label": label or kind.upper(), "ips": ips,
            "latency_mean_ms": lat, "latency_p95_ms": lat * 1.2,
            "during": {"npu": 90.0 if kind == "npu" else 0.0, "cpu": cpu, "app_cpu": cpu / 2, "gpu": gpu, "power_w": power}}


BASE = {"npu": 0.0, "cpu": 4.0, "app_cpu": 0.2, "gpu": 1.0, "power_w": 6.0}


def _hw(host, cpu, npu=True):
    return {"host": host, "cpu": cpu, "machine_type": "laptop", "cores_logical": 16, "ram_gb": 32,
            "npu_names": ["Intel(R) AI Boost"] if npu else [], "rated_npu": rated_npu(cpu)}


@pytest.mark.parametrize("cpu,tops", [
    ("Intel(R) Core(TM) Ultra 7 258V", 48),
    ("Intel(R) Core(TM) Ultra 7 155H", 11),
    ("Intel(R) Core(TM) Ultra 9 285H", 13),
    ("AMD Ryzen AI 9 HX 370 w/ Radeon 890M", 50),
    ("AMD Ryzen 7 7840U w/ Radeon 780M Graphics", 10),
    ("AMD Ryzen 7 7700 8-Core Processor", None),        # desktop, no NPU
    ("Snapdragon(R) X Elite - X1E78100 - Qualcomm(R) Oryon(TM) CPU", 45),
    ("Intel(R) Xeon(R) Gold 6338 CPU @ 2.00GHz", None),
])
def test_rated_tops(cpu, tops):
    assert rated_npu(cpu)["tops"] == tops


def test_strong_npu_laptop_scores_high_with_evidence():
    bench = {"baseline": BASE, "seconds": 8, "results": [
        _run("npu", 400, 2.5, 8, power=9.0), _run("gpu", 300, 3.3, 15, gpu=95), _run("cpu", 100, 10, 98, power=28.0)]}
    r = assess(_hw("lnl", "Intel(R) Core(TM) Ultra 7 258V"), bench, "MobileNetV2", "battery")
    assert r["score"] >= 75 and r["verdict"].startswith("Excellent")
    text = " ".join(r["pros"])
    assert "4.0×" in text and "Copilot+" in text and "inferences per joule" in text
    assert r["workloads"][0]["kind"] == "npu"            # camera -> NPU
    assert r["metrics"]["cpu_offload_factor"] > 5


def test_no_npu_server_is_not_recommended_and_unmeasurable_is_excluded():
    bench = {"baseline": BASE, "seconds": 8, "gpu_measured": False, "results": [_run("cpu", 150, 6.6, 99)]}
    r = assess({**_hw("srv", "Intel(R) Xeon(R) Gold 6338 CPU", npu=False), "machine_type": "server"}, bench, "m")
    assert r["score"] < 35 and "No NPU" in r["cons"][0]
    assert any("Servers" in x for x in r["recommendations"])


def test_missing_power_is_not_measurable_not_zero():
    bench = {"baseline": BASE, "seconds": 8, "results": [_run("npu", 200, 5, 10), _run("cpu", 100, 10, 98)]}
    r = assess(_hw("a", "Intel(R) Core(TM) Ultra 7 155H"), bench, "m")
    eff = next(c for c in r["criteria"] if c["key"] == "efficiency")
    assert eff["points"] is None
    assert any("unplug" in x for x in r["recommendations"])


def test_compare_ranks_and_explains_winner():
    a = assess(_hw("lunar", "Intel(R) Core(TM) Ultra 7 258V"), {"baseline": BASE, "seconds": 8, "results": [
        _run("npu", 400, 2.5, 8), _run("cpu", 100, 10, 98)]}, "m")
    b = assess(_hw("meteor", "Intel(R) Core(TM) Ultra 7 155H"), {"baseline": BASE, "seconds": 8, "results": [
        _run("npu", 150, 6.6, 12), _run("cpu", 90, 11, 98)]}, "m")
    c = assess(_hw("server", "Intel(R) Xeon(R) Gold", npu=False), {"baseline": BASE, "seconds": 8, "results": [
        _run("cpu", 200, 5, 99)]}, "m")
    out = compare([c, b, a])
    assert [x["host"] for x in out["ranking"]] == ["lunar", "meteor", "server"]
    why = " ".join(out["why_best"])
    assert "400" in why and "150" in why and "Copilot+" in why and "server" in why


def test_compare_warns_on_model_mismatch():
    a = assess(_hw("a", "x"), {"baseline": BASE, "results": [_run("cpu", 1, 1, 1)]}, "m1")
    b = assess(_hw("b", "x"), {"baseline": BASE, "results": [_run("cpu", 1, 1, 1)]}, "m2")
    assert compare([a, b])["warnings"]
