import io
import time

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from npu_monitor.server import create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as c:
        time.sleep(1.2)  # a couple of sampler ticks
        yield c


def _wait(client, job_id, timeout=120):
    t0 = time.time()
    while time.time() - t0 < timeout:
        j = client.get(f"/api/jobs/{job_id}").json()
        if j["status"] in ("done", "error"):
            return j
        time.sleep(0.3)
    raise AssertionError("job timed out")


def test_system_and_metrics(client):
    s = client.get("/api/system").json()
    assert s["inference"]["devices"], "expected at least a CPU backend"
    m = client.get("/api/metrics").json()
    assert {"cpu", "gpu", "npu", "phase"} <= m.keys()
    assert client.get("/").status_code == 200


def test_websocket_streams_samples(client):
    with client.websocket_connect("/ws/metrics") as ws:
        msg = ws.receive_json()
        assert "sample" in msg and "npu" in msg["sample"]


def test_file_job_and_frame(client):
    buf = io.BytesIO()
    Image.new("RGB", (320, 240), (10, 120, 200)).save(buf, "PNG")
    r = client.post("/api/files", files=[("files", ("blue.png", buf.getvalue(), "image/png")),
                                         ("files", ("bad.docx", b"zz", "application/octet-stream"))],
                    data={"repeat": "3"})
    j = _wait(client, r.json()["id"])
    assert j["status"] == "done", j["error"]
    assert j["stats"]["inferences"] == 3 and len(j["items"]) == 1
    assert any("error" in f for f in j["files"])
    fr = client.post("/api/frame", content=buf.getvalue(), headers={"Content-Type": "image/png"})
    assert fr.status_code == 200 and len(fr.json()["top"]) == 3


def test_benchmark_and_csv(client):
    dev = client.get("/api/system").json()["inference"]["devices"][0]["id"]
    j = _wait(client, client.post("/api/benchmark", json={"devices": [dev], "seconds": 3}).json()["id"])
    assert j["status"] == "done" and j["results"][0]["ips"] > 0
    assert j["baseline"]["samples"] > 0
    csv = client.get("/api/export.csv").text
    assert csv.startswith("timestamp,phase,npu_util")
    imp = client.get("/api/impact?seconds=60").json()
    assert "correlation" in imp


def test_assessment_saves_report_and_compares(client, tmp_path, monkeypatch):
    import npu_monitor.jobs as jobs
    monkeypatch.setattr(jobs, "REPORTS_DIR", str(tmp_path))
    j = _wait(client, client.post("/api/assessment", json={"seconds": 3}).json()["id"])
    assert j["status"] == "done", j["error"]
    r = j["report"]
    assert 0 <= r["score"] <= 100 and r["verdict"] and r["file"]
    saved = client.get("/api/reports").json()
    assert saved[0]["file"] == r["file"]
    html = client.get(f"/api/reports/{r['file']}/html")
    assert html.status_code == 200 and "NPU Suitability Report" in html.text
    assert client.get("/api/reports/..%2F..%2Fetc%2Fpasswd").status_code == 404
    cmp = client.post("/api/compare", json=[r, {**r, "hardware": {**r["hardware"], "host": "other"}, "score": 100}]).json()
    assert [x["host"] for x in cmp["ranking"]] == ["other", r["hardware"]["host"]] and cmp["why_best"]
