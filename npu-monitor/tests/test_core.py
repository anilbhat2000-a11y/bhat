import io
import time

import numpy as np
import openpyxl
import pytest
from PIL import Image

from npu_monitor.sources.files import UnsupportedFile, extract
from npu_monitor.telemetry.npu import BusyTracker
from npu_monitor.telemetry.sampler import classify, impact
from npu_monitor.telemetry.windows_counters import parse_engine_values


def _png(color=(200, 30, 30), size=(64, 48)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


def test_busy_tracker_merges_overlaps():
    t = BusyTracker()
    t.record("npu", 9.0, 9.5)
    t.record("npu", 9.25, 9.75)  # overlaps the first span
    assert t.utilisation("npu", 1.0, now=10.0) == 75.0
    assert t.utilisation("gpu", 1.0, now=10.0) == 0.0


def test_windows_counter_parsing_splits_gpu_and_npu():
    raw = {
        "pid_10_luid_0x00000000_0x0000AAAA_phys_0_eng_0_engtype_3D": 30.0,
        "pid_11_luid_0x00000000_0x0000AAAA_phys_0_eng_0_engtype_3D": 25.0,   # same engine, summed
        "pid_11_luid_0x00000000_0x0000AAAA_phys_0_eng_1_engtype_VideoDecode": 5.0,
        "pid_12_luid_0x00000000_0x0000BBBB_phys_0_eng_0_engtype_Compute": 64.0,
        "garbage": 99.0,
    }
    out = parse_engine_values(raw)
    assert out["0x0000aaaa"] == {"util": 55.0, "engine_types": ["3D", "VideoDecode"], "kind": "gpu"}
    assert out["0x0000bbbb"]["kind"] == "npu" and out["0x0000bbbb"]["util"] == 64.0


def test_windows_counter_pinned_luid(monkeypatch):
    monkeypatch.setenv("NPU_MONITOR_NPU_LUID", "0x0000AAAA")
    out = parse_engine_values({"pid_1_luid_0x0_0x0000AAAA_phys_0_eng_0_engtype_3D": 10.0})
    assert out["0x0000aaaa"]["kind"] == "npu"


def _sample(npu, cpu, gpu, inference=None, power=None):
    return {"npu": {"util": npu}, "cpu": {"util": cpu, "app_util": cpu / 2, "mem_used_pct": 40.0, "power_w": power},
            "gpu": [{"util": gpu}], "inference": inference or {}}


def test_impact_reports_delta_and_correlation():
    idle = [_sample(0, 5 + i % 2, 2, power=4.0) for i in range(10)]
    busy = [_sample(80 + i % 3, 25 + i % 2, 3, {"npu": {"ips": 30}}, power=9.0) for i in range(10)]
    r = impact(idle + busy)
    assert r["idle"]["samples"] == 10 and r["npu_active"]["samples"] == 10
    assert r["delta"]["cpu"] == pytest.approx(20.0, abs=0.1)
    assert r["delta"]["power_w"] == 5.0
    assert r["correlation"]["npu_cpu"] > 0.9


def test_classify_other_when_cpu_inference():
    assert classify(_sample(0, 50, 0, {"cpu": {"ips": 5}})) == "other"
    assert classify(_sample(0, 3, 0)) == "idle"


def test_extract_image_and_unsupported():
    kind, items, _ = extract("a.png", _png())
    assert kind == "image" and items[0].image.size == (64, 48)
    with pytest.raises(UnsupportedFile):
        extract("a.docx", b"x")


def test_extract_pdf_pages_and_embedded_images():
    import pymupdf as fitz

    doc = fitz.open()
    for _ in range(2):
        page = doc.new_page()
        page.insert_text((72, 72), "hello NPU")
        page.insert_image(fitz.Rect(72, 100, 272, 250), stream=_png(size=(200, 150)))
    kind, items, summary = extract("d.pdf", doc.tobytes())
    assert kind == "pdf" and summary["pages"] == 2 and summary["embedded_images"] == 2
    assert [i.meta["type"] for i in items].count("page") == 2


def test_extract_excel_renders_sheets_with_stats():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales"
    ws.append(["region", "q1", "q2"])
    ws.append(["north", 10, 20])
    ws.append(["south", 30, 40])
    wb.create_sheet("Empty")
    buf = io.BytesIO()
    wb.save(buf)
    kind, items, summary = extract("s.xlsx", buf.getvalue())
    assert kind == "excel" and len(items) == 2
    s = summary["sheets"]["Sales"]
    assert s["numeric_cells"] == 4 and s["sum"] == 100 and s["mean"] == 25


def test_extract_csv():
    kind, items, summary = extract("t.csv", b"a,b\n1,2\n3,x\n")
    assert kind == "csv" and summary["table"]["numeric_cells"] == 3
