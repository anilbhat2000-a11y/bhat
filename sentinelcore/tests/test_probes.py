import base64
import hashlib
import socket
import subprocess
import threading

import pytest

from sentinel.health import drivers, probes

needs_ffmpeg = pytest.mark.skipif(not probes.ffprobe_available(), reason="ffmpeg not installed")


@pytest.fixture(scope="module")
def video(tmp_path_factory):
    p = tmp_path_factory.mktemp("v") / "test.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=25", "-t", "4",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", str(p)], check=True)
    return str(p)


@needs_ffmpeg
def test_probe_stream_measures_fps_and_bitrate(video):
    stats, err = probes.probe_stream(video, seconds=3)
    assert err == ""
    assert stats["codec"] == "h264" and stats["width"] == 640 and stats["height"] == 360
    assert 24.0 <= stats["fps"] <= 26.0
    assert stats["bitrate_kbps"] > 0


@needs_ffmpeg
def test_frame_grab_and_image_health(video, tmp_path):
    frame, err = probes.grab_gray_frame(video)
    assert err == "" and len(frame) == probes.FRAME_W * probes.FRAME_H
    st = probes.image_stats(frame)
    flags = probes.classify_image(st, frame, frame, frame)
    assert not flags["blank"] and not flags["too_dark"] and not flags["blurred"]
    assert flags["frozen"] is True          # identical consecutive frames
    assert flags["view_changed"] is False
    black = tmp_path / "black.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=black:size=320x180:rate=5", "-t", "1",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", str(black)], check=True)
    bframe, _ = probes.grab_gray_frame(str(black))
    bflags = probes.classify_image(probes.image_stats(bframe), None, frame, bframe)
    assert bflags["too_dark"] and bflags["blank"] and bflags["view_changed"]


@needs_ffmpeg
def test_blur_detected():
    sharp = bytes((255 if (x // 4 + y // 4) % 2 else 0) for y in range(probes.FRAME_H) for x in range(probes.FRAME_W))
    smooth = bytes(int(40 + 160 * x / probes.FRAME_W) for y in range(probes.FRAME_H) for x in range(probes.FRAME_W))
    assert probes.image_stats(sharp)["sharpness"] > 1000
    s = probes.image_stats(smooth)
    assert probes.classify_image(s, None, None, smooth)["blurred"]


def test_stats_from_ffprobe_json_without_packets():
    assert probes.stream_stats_from_ffprobe_json({"streams": [{"codec_name": "hevc"}], "packets": []}) == {"codec": "hevc"}


def _fake_rtsp_server(reply: bytes):
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    got = {}

    def serve():
        conn, _ = srv.accept()
        got["req"] = conn.recv(1024)
        conn.sendall(reply)
        conn.close()
        srv.close()
    threading.Thread(target=serve, daemon=True).start()
    return port, got


def test_rtsp_options_ok_and_auth_required():
    port, got = _fake_rtsp_server(b"RTSP/1.0 200 OK\r\nCSeq: 1\r\nPublic: DESCRIBE, SETUP\r\n\r\n")
    r = probes.rtsp_options(f"rtsp://127.0.0.1:{port}/stream1", timeout=2)
    assert r.reachable and r.status_code == 200 and r.latency_ms is not None
    assert got["req"].startswith(b"OPTIONS rtsp://127.0.0.1:")
    port, _ = _fake_rtsp_server(b"RTSP/1.0 401 Unauthorized\r\nCSeq: 1\r\n\r\n")
    assert probes.rtsp_options(f"rtsp://127.0.0.1:{port}/", timeout=2).reachable


def test_rtsp_options_rejects_non_rtsp_and_closed_port():
    port, _ = _fake_rtsp_server(b"HTTP/1.1 200 OK\r\n\r\n")
    assert not probes.rtsp_options(f"rtsp://127.0.0.1:{port}/", timeout=2).reachable
    s = socket.socket(); s.bind(("127.0.0.1", 0)); closed = s.getsockname()[1]; s.close()
    assert not probes.rtsp_options(f"rtsp://127.0.0.1:{closed}/", timeout=1).reachable


def test_credentials_and_redaction():
    u = probes.with_credentials("rtsp://10.0.0.5:554/Streaming/Channels/101", "admin", "p@ss:word")
    assert u == "rtsp://admin:p%40ss%3Aword@10.0.0.5:554/Streaming/Channels/101"
    assert "***" in probes.redact(u) and "p%40ss" not in probes.redact(u)
    assert probes.with_credentials("rtsp://u:p@h/x", "a", "b") == "rtsp://u:p@h/x"


def test_ws_username_token_digest():
    nonce, created = b"0123456789abcdef", "2026-01-01T00:00:00Z"
    xml = probes.ws_username_token("admin", "secret", nonce, created)
    expected = base64.b64encode(hashlib.sha1(nonce + created.encode() + b"secret").digest()).decode()
    assert expected in xml and base64.b64encode(nonce).decode() in xml


def test_parse_onvif_responses():
    dt = """<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tt="http://www.onvif.org/ver10/schema"
    xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><s:Body><tds:GetSystemDateAndTimeResponse><tds:SystemDateAndTime>
    <tt:UTCDateTime><tt:Time><tt:Hour>10</tt:Hour><tt:Minute>20</tt:Minute><tt:Second>30</tt:Second></tt:Time>
    <tt:Date><tt:Year>2026</tt:Year><tt:Month>11</tt:Month><tt:Day>22</tt:Day></tt:Date></tt:UTCDateTime>
    </tds:SystemDateAndTime></tds:GetSystemDateAndTimeResponse></s:Body></s:Envelope>"""
    d = probes.parse_onvif_datetime(dt)
    assert (d.year, d.month, d.day, d.hour, d.minute, d.second) == (2026, 11, 22, 10, 20, 30)
    info = """<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
    <s:Body><tds:GetDeviceInformationResponse><tds:Manufacturer>ACME</tds:Manufacturer><tds:Model>X1</tds:Model>
    <tds:FirmwareVersion>1.2.3</tds:FirmwareVersion><tds:SerialNumber>SN9</tds:SerialNumber><tds:HardwareId>h</tds:HardwareId>
    </tds:GetDeviceInformationResponse></s:Body></s:Envelope>"""
    assert probes.parse_onvif_device_info(info) == {"manufacturer": "ACME", "model": "X1", "firmware": "1.2.3", "serial": "SN9"}


def test_parse_isapi_storage_and_summary():
    xml = """<?xml version="1.0" encoding="UTF-8"?><storage xmlns="http://www.hikvision.com/ver20/XMLSchema">
    <hddList><hdd><id>1</id><hddName>hdd1</hddName><status>ok</status><capacity>3815447</capacity><freeSpace>1048576</freeSpace></hdd>
    <hdd><id>2</id><status>error</status><capacity>3815447</capacity><freeSpace>0</freeSpace></hdd></hddList></storage>"""
    disks = drivers.parse_isapi_storage(xml)
    assert [d["status"] for d in disks] == ["ok", "error"]
    s = drivers.summarize_disks(disks)
    assert s["disk_errors"] == 1 and s["disk_count"] == 2 and 80 < s["storage_used_pct"] < 90
    info = drivers.parse_isapi_device_info("<DeviceInfo xmlns='x'><model>DS-7616</model><firmwareVersion>V4.1</firmwareVersion></DeviceInfo>")
    assert info == {"model": "DS-7616", "firmware": "V4.1", "manufacturer": "Hikvision"}


def test_unknown_driver_and_crashing_driver_never_raise():
    class Cam:
        id, driver = 1, "nope"
    assert drivers.read_camera(Cam()).online is False
    drivers.CAMERA_DRIVERS["boom"] = lambda c: 1 / 0
    Cam.driver = "boom"
    r = drivers.read_camera(Cam())
    assert r.online is False and "driver error" in r.error
    del drivers.CAMERA_DRIVERS["boom"]
