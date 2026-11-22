# SentinelCore

SentinelCore is on-premise software that brings many CCTV cameras and NVRs into one place. It:

- monitors camera, battery and NVR health
- runs AI analytics rules
- gives User/Operator and Admin dashboards

It works with **no internet connection**: there are no cloud calls or CDN assets, and the UI is served by the server itself.

It was built from `prompts/ai-cctv-onprem-build-prompt.md`. This repository covers **Phase 1 (foundation)**, **Phase 2 (health monitoring)** and the **Phase 3 AI rule engine**. See [docs/VERIFICATION.md](docs/VERIFICATION.md) for what is done, what has been tested, and what is not done yet.

## Quick start (evaluation, simulated devices)

```bash
cd sentinelcore
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
SC_SECRET_KEY=change-me-to-a-long-random-string SC_ADMIN_PASSWORD='Admin@123456' SC_SEED_DEMO=1 \
  uvicorn sentinel.main:app --port 8080
```

Open http://localhost:8080 and sign in as `admin` / `Admin@123456`.

The demo creates:

- 3 sites, 4 NVRs and 48 cameras. Some cameras are battery or solar powered.
- Demo users `operator1`, `siteadmin`, `viewer1` and `auditor1`, all with password `Demo@12345`.

Demo devices use the `simulator` driver, and the UI shows a **SIMULATED DATA** badge whenever simulated readings are on screen.

## Production (Docker Compose + PostgreSQL)

```bash
cp .env.example .env   # set SC_SECRET_KEY, SC_ADMIN_PASSWORD, POSTGRES_PASSWORD
docker compose up -d
```

Put it behind HTTPS (nginx/Caddy with your internal CA) and set `SC_COOKIE_SECURE=1`. If `SC_ADMIN_PASSWORD` is empty, the first admin password is generated and printed once in the logs.

## Adding real cameras

| Method | Where | Notes |
|---|---|---|
| Single camera | Add & import devices → Add camera | RTSP URL and/or ONVIF host |
| Bulk CSV | Add & import devices → Bulk CSV import | Download the template first. All rows are validated; nothing is imported unless every row is valid |
| Whole NVR | Add NVR, then Import NVR channels | Built-in RTSP paths for Hikvision, Dahua and CP Plus, or your own `{host}/{port}/{ch}` template |
| Auto-discovery | ONVIF discovery | WS-Discovery multicast. Only reaches the server's own network segment |

Set the camera **health driver**:

- `generic`: the full check. Sends an RTSP OPTIONS request, then uses ffprobe to measure FPS, bitrate, codec and resolution. It grabs a frame for image health (blur, blank, dark, frozen, view changed). It also reads clock drift and firmware over ONVIF. Needs FFmpeg on the server.
- `rtsp`: reachability only. Cheap enough for very large fleets.

The NVR drivers are:

- `tcp`: checks that the NVR's web port answers.
- `hikvision_isapi`: also reads model, firmware and disk status. Confirm it on your firmware first; see VERIFICATION.md.

**Battery data:** ONVIF has no standard battery query, so battery values for real cameras need a vendor driver. Until one is added, the dashboard shows **"Not supported by device"**. It never shows an estimate.

## Edge AI (hybrid architecture)

1. Register an edge box under **Edge devices**. You get an API key, shown once.
2. On the box (Jetson / NUC / GPU server), install `numpy` and the right `onnxruntime` build for the hardware, then run:

```bash
python -m sentinel.analytics.runner --server https://sentinel.local --api-key sc_... \
  --camera-id 12 --url rtsp://... --model yolov8n.onnx --rules rules.json --fps 5
```

`rules.json` is a list of analytic configs. For example:

```json
[{"type": "zone_intrusion", "name": "Yard", "polygon": [[0.1,0.5],[0.9,0.5],[0.9,0.95],[0.1,0.95]],
  "classes": ["person", "car"], "min_confidence": 0.5, "min_track_age": 3}]
```

Available rule types: `zone_intrusion`, `line_crossing`, `people_count`, `loitering`, `occupancy`, `crowd_density`, `object_left`.

Operators mark each event as True or False. Those marks drive the false-alarm rate shown on the dashboard, which is what you use to tune thresholds.

## Tests

```bash
pytest -q                                           # SQLite
SC_TEST_DATABASE_URL=postgresql+psycopg://user@host/db pytest -q   # PostgreSQL
```

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `SC_DATABASE_URL` | `sqlite:///./sentinel.db` | `postgresql+psycopg://…` for production |
| `SC_SECRET_KEY` | random (dev only) | Signs logins and encrypts device passwords. **Required in production** |
| `SC_ADMIN_PASSWORD` | generated | Password for the first `admin` user |
| `SC_COLLECT_INTERVAL` | 30 | Seconds between health checks |
| `SC_PROBE_TIMEOUT` | 4 | Timeout for each network probe, in seconds |
| `SC_METRIC_RETENTION_DAYS` | 90 | How long health history is kept |
| `SC_SEED_DEMO` | 0 | Create the simulated demo fleet on first start |
| `SC_COOKIE_SECURE` | 0 | Set to 1 when served over HTTPS |

API documentation (OpenAPI) is at `/docs`. Note: the Swagger page itself loads its assets from a CDN, so on an air-gapped network use `/openapi.json` instead.
