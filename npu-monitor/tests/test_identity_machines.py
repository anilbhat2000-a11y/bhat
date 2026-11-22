import time
from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient

from npu_monitor import identity
from npu_monitor.server import create_app

PW = "Adm1n-pass-123"


def test_linux_dmi_parsing(tmp_path, monkeypatch):
    d = tmp_path / "dmi"
    d.mkdir()
    vals = {"sys_vendor": "LENOVO", "product_name": "21LK", "product_version": "ThinkPad X1 Carbon Gen 12",
            "product_serial": "PF4ABCDE", "bios_vendor": "LENOVO", "bios_version": "N3YET55W (1.30 )",
            "bios_date": "03/14/2024", "chassis_type": "10", "board_serial": "Default string",
            "chassis_asset_tag": "No Asset Information", "product_uuid": "1234-ABCD"}
    for k, v in vals.items():
        (d / k).write_text(v + "\n")
    monkeypatch.setenv("NPU_MONITOR_DMI_DIR", str(d))
    monkeypatch.setattr(identity.sys, "platform", "linux")
    out = identity.collect()
    assert out["manufacturer"] == "LENOVO" and out["model"] == "21LK"
    assert out["model_version"] == "ThinkPad X1 Carbon Gen 12" and out["serial_number"] == "PF4ABCDE"
    assert out["bios_release_date"] == "2024-03-14" and out["chassis"] == "laptop"
    assert out["board_serial"] is None                      # "Default string" is placeholder junk
    assert out["manufacture"]["date"] <= "2024-03-14"


def test_junk_and_dates():
    for junk in ("To be filled by O.E.M.", "Default string", "System Serial Number", "0", " ", None):
        assert identity.clean(junk) is None
    assert identity.clean(" 5CG1234XYZ ") == "5CG1234XYZ"
    assert identity._wmi_date("20230115000000.000000+000") == "2023-01-15"
    assert identity._us_date("12/31/2022") == "2022-12-31"
    est = identity.estimate_manufacture({"bios_release_date": "2023-06-01", "battery_manufacture_date": "2023-04-20",
                                         "os_install_date": "2023-07-02"})
    assert est == {"date": "2023-04-20", "source": "battery manufacture date", "confidence": "good"}
    future = date.today().replace(year=date.today().year + 1).isoformat()
    assert identity.estimate_manufacture({"bios_release_date": future})["date"] is None


@pytest.fixture()
def hub(tmp_path, monkeypatch):
    import npu_monitor.auth as auth
    import npu_monitor.fleet as fleet
    monkeypatch.setattr(auth, "DATA_DIR", str(tmp_path / "a"))
    monkeypatch.setattr(fleet, "DATA_DIR", str(tmp_path / "f"))
    with TestClient(create_app()) as c:
        assert c.post("/api/auth/setup", json={"username": "admin", "password": PW}).status_code == 200
        yield c


def test_manual_machine_edit_csv(hub):
    r = hub.post("/api/machines/manual", json={"name": "Reception PC", "manufacturer": "HP", "model": "EliteDesk 800 G4",
                                               "serial_number": "CZC1234567", "manufacture_date": "2019-05-10",
                                               "machine_type": "desktop", "location": "Front desk"})
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    assert hub.post("/api/machines/manual", json={"name": "x", "manufacture_date": "10/05/2019"}).status_code == 400
    assert hub.patch(f"/api/machines/{mid}", json={"owner": "Priya", "serial_number": "CZC7654321"}).status_code == 200
    assert hub.patch("/api/machines/self", json={"location": "Server room", "manufacture_date": "2024-02-01"}).status_code == 200
    lst = hub.get("/api/fleet").json()
    me, pc = lst[0], next(m for m in lst if m["id"] == mid)
    assert me["self"] and me["location"] == "Server room" and me["manufacture_date"] == "2024-02-01"
    assert pc["online"] is None and pc["identity"]["serial_number"] == "CZC7654321" and pc["owner"] == "Priya"
    csv = hub.get("/api/machines.csv").text
    assert "Reception PC,manual,manual entry,HP,EliteDesk 800 G4,CZC7654321" in csv
    assert "2024-02-01,set by admin" in csv
    assert hub.delete(f"/api/machines/{mid}").status_code == 200
    assert "identity" in hub.get("/api/node").json()


def test_enrolment_code_flow(hub, monkeypatch):
    added = {}

    def fake_add(self, url, token="", name="", meta=None, added_by="", via="connect"):
        added.update(url=url, token=token, via=via)
        return {"id": "p1", "name": name or "laptop-7", "url": url}

    import npu_monitor.fleet as fleet
    monkeypatch.setattr(fleet.FleetManager, "add", fake_add)
    code = hub.post("/api/machines/codes").json()["code"]
    assert len(code) == 9 and code[4] == "-"
    anon = TestClient(hub.app)  # a different machine, not signed in
    assert anon.post("/api/machines/enrol", json={"code": "AAAA-BBBB", "url": "http://10.0.0.7:8765", "token": "t"}).status_code == 403
    r = anon.post("/api/machines/enrol", json={"code": code.lower(), "url": "http://0.0.0.0:8765", "token": "t0k"})
    assert r.status_code == 200, r.text
    assert added["via"] == "enrolment code" and added["token"] == "t0k"
    assert "0.0.0.0" not in added["url"]                     # replaced with the caller's address
    assert anon.post("/api/machines/enrol", json={"code": code, "url": "http://10.0.0.7:8765", "token": "t"}).status_code == 403  # single use
    assert hub.post("/api/machines/manual", json={"name": "x"}).status_code == 200
    anon.cookies.clear()
    assert anon.post("/api/machines/codes").status_code == 401
