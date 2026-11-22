from sqlalchemy import select

from sentinel import onboarding
from sentinel.db import Base, SessionLocal, engine
from sentinel.models import NVR, Camera, Location, Organization
from sentinel.security import decrypt_secret


def setup_module():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(Location).where(Location.name == "CSV Location A")):
            org = Organization(name="CSV Org", code="CSVO")
            db.add(org)
            db.flush()
            root = Location(org_id=org.id, name="CSV HQ", kind="corporate")
            db.add(root)
            db.flush()
            db.add_all([Location(org_id=org.id, parent_id=root.id, name="CSV Location A", code="CSV-A"),
                        Location(org_id=org.id, parent_id=root.id, name="CSV Location B")])
            db.commit()


HEADER = "name,location,host,rtsp_url,password,power_type,target_fps\n"


def test_csv_all_or_nothing_and_errors():
    bad = HEADER + ("Cam1,CSV Location A,10.0.0.1,rtsp://10.0.0.1/s,pw,poe,25\n"
                    "Cam2,Nowhere,10.0.0.2,,,poe,25\n"
                    "Cam3,CSV Location A,,http://x,,laser,abc\n"
                    "Cam1,CSV Location A,10.0.0.9,,,poe,25\n")
    with SessionLocal() as db:
        res = onboarding.import_csv(db, bad, None)
        assert res["imported"] == 0
        rows = {e["row"]: e["error"] for e in res["errors"]}
        assert "unknown location" in rows[3]
        assert "rtsp://" in rows[4] and "power_type" in rows[4] and "target_fps" in rows[4]
        assert "duplicate" in rows[5]
        assert db.scalar(select(Camera).where(Camera.name == "Cam1")) is None


def test_csv_dry_run_then_import_and_scope():
    good = HEADER + "Gate,CSV Location A,10.0.0.1,rtsp://10.0.0.1/s,s3cret,battery,15\nDock,CSV Location B,10.0.0.2,,,poe,\n"
    with SessionLocal() as db:
        a = db.scalar(select(Location).where(Location.name == "CSV Location A"))
        scoped = onboarding.import_csv(db, good, {a.id})
        assert scoped["imported"] == 0 and "no permission" in scoped["errors"][0]["error"]
        dry = onboarding.import_csv(db, good, None, dry_run=True)
        assert dry["valid_rows"] == 2 and dry["errors"] == [] and dry["imported"] == 0 and len(dry["location_ids"]) == 2
        assert onboarding.import_csv(db, good, None)["imported"] == 2
        gate = db.scalar(select(Camera).where(Camera.name == "Gate"))
        assert gate.power_type == "battery" and gate.target_fps == 15 and decrypt_secret(gate.password_enc) == "s3cret"
        assert gate.password_enc != "s3cret"


def test_csv_location_by_code_path_and_ambiguity():
    with SessionLocal() as db:
        org = db.scalar(select(Organization).where(Organization.code == "CSVO"))
        hq = db.scalar(select(Location).where(Location.name == "CSV HQ"))
        # A second "Lobby" under a different parent makes the plain name ambiguous.
        a = db.scalar(select(Location).where(Location.name == "CSV Location A"))
        b = db.scalar(select(Location).where(Location.name == "CSV Location B"))
        db.add_all([Location(org_id=org.id, parent_id=a.id, name="Lobby"), Location(org_id=org.id, parent_id=b.id, name="Lobby")])
        db.flush()
        text = HEADER + ("C1,csv-a,1.1.1.1,,,poe,\n"
                         "C2,CSV HQ / CSV Location B / Lobby,1.1.1.2,,,poe,\n"
                         "C3,Lobby,1.1.1.3,,,poe,\n")
        res = onboarding.import_csv(db, text, None, dry_run=True)
        assert [e["row"] for e in res["errors"]] == [4] and "matches 2 locations" in res["errors"][0]["error"]
        assert hq.id not in res["location_ids"] and a.id in res["location_ids"]
        db.rollback()


def test_missing_columns():
    with SessionLocal() as db:
        res = onboarding.import_csv(db, "host\n1.2.3.4\n", None)
        assert "missing column" in res["errors"][0]["error"]


def test_nvr_channel_import_skips_existing():
    with SessionLocal() as db:
        location = db.scalar(select(Location).where(Location.name == "CSV Location A"))
        nvr = NVR(location_id=location.id, name="HQ-NVR", vendor="hikvision", host="10.1.1.10", channels=4,
                  department="Security")
        db.add(nvr)
        db.flush()
        first = onboarding.import_nvr_channels(db, nvr, [1, 2])
        assert [c.rtsp_url for c in first] == ["rtsp://10.1.1.10:554/Streaming/Channels/101",
                                              "rtsp://10.1.1.10:554/Streaming/Channels/201"]
        assert first[0].sub_stream_url.endswith("/102")
        assert first[0].department == "Security"
        second = onboarding.import_nvr_channels(db, nvr)
        assert sorted(c.channel for c in second) == [3, 4]
        db.commit()


def test_channel_url_templates():
    assert onboarding.channel_urls("dahua", "h", 554, 3)[1] == "rtsp://h:554/cam/realmonitor?channel=3&subtype=1"
    assert onboarding.channel_urls("acme", "h", 8554, 2, "rtsp://{host}:{port}/live/ch{ch}")[0] == "rtsp://h:8554/live/ch2"
    try:
        onboarding.channel_urls("acme", "h", 554, 1)
        raise AssertionError("expected ValueError")
    except ValueError:
        pass


def test_parse_probe_match():
    xml = b"""<?xml version="1.0"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope"
    xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
    <SOAP-ENV:Body><d:ProbeMatches><d:ProbeMatch><wsa:EndpointReference><wsa:Address>urn:uuid:abc</wsa:Address></wsa:EndpointReference>
    <d:Scopes>onvif://www.onvif.org/name/Front%20Door onvif://www.onvif.org/hardware/DS-2CD2043</d:Scopes>
    <d:XAddrs>http://192.168.1.64:8000/onvif/device_service</d:XAddrs></d:ProbeMatch></d:ProbeMatches></SOAP-ENV:Body></SOAP-ENV:Envelope>"""
    m = onboarding.parse_probe_match(xml)
    assert m["host"] == "192.168.1.64" and m["onvif_port"] == 8000 and m["name"] == "Front Door"
    assert m["hardware"] == "DS-2CD2043" and m["endpoint"] == "urn:uuid:abc"
    assert onboarding.parse_probe_match(b"not xml") is None
    assert b"NetworkVideoTransmitter" in onboarding.probe_message()
