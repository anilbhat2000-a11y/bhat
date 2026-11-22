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

The demo creates two organizations:

- **Acme Retail** (device changes need approval): Corporate Office › West Region › Mumbai Andheri Branch and Pune Warehouse, plus South Region › Chennai T Nagar Store.
- **Globex Logistics**: Head Office › Gurugram Hub.
- 6 NVRs and 48 cameras in total. Some cameras are battery or solar powered.
- Alert contacts with designations, including escalation contacts.

Demo users all have the password `Demo@12345`:

| User | Role | Sees |
|---|---|---|
| `acme.admin` | Org admin | All of Acme |
| `west.manager` | Location admin | West Region and everything under it; approves branch changes |
| `andheri.admin` | Location admin | Mumbai Andheri Branch; their device changes need approval |
| `andheri.guard` | Operator | Mumbai Andheri Branch |
| `acme.auditor` | Auditor | All of Acme, read-only, plus audit log |
| `globex.admin` | Org admin | All of Globex |

Demo devices use the `simulator` driver, and the UI shows a **SIMULATED DATA** badge whenever simulated readings are on screen.

## Production (Docker Compose + PostgreSQL)

```bash
cp .env.example .env   # set SC_SECRET_KEY, SC_ADMIN_PASSWORD, POSTGRES_PASSWORD
docker compose up -d
```

Put it behind HTTPS (nginx/Caddy with your internal CA) and set `SC_COOKIE_SECURE=1`. If `SC_ADMIN_PASSWORD` is empty, the first admin password is generated and printed once in the logs.

## Organizations, locations and access

- **Organizations.** Each customer is an organization. Its devices, users, contacts and audit log are invisible to other organizations. Only the platform `admin` (super admin) sees every organization.
- **Locations.** Each organization has a named location tree, for example Corporate Office › West Region › Mumbai Andheri Branch › 2nd Floor › Server Room. Cameras and NVRs can be attached at any level.
- **Access by hierarchy.** A user assigned to a location sees and manages that location and everything under it. Roles, from highest to lowest:

| Role | Scope | Can do |
|---|---|---|
| Super admin | All organizations | Everything; creates organizations |
| Org admin | Whole organization | Devices, locations, users, contacts, approvals, reboot |
| Location admin | Assigned locations and below | Same as org admin, within scope; can only create users with lower roles |
| Operator | Assigned locations and below | Acknowledge alerts, review AI events |
| Viewer | Assigned locations and below | View only |
| Auditor | Whole organization | View only, plus audit log |

- **Approvals.** Turn on "Device changes need approval" for an organization. Then adding, editing, deactivating or deleting a camera or NVR by a location admin waits on the **Approvals** page. It applies only after someone higher up approves it: an org admin, or a location admin assigned above the requester. Nobody can approve their own request.
- **Alert contacts.** Each location can have contacts with name, designation, mobile number and email.
  - A contact gets alerts for that location and everything under it, filtered by severity and by device type.
  - An escalation contact is told only if an alert is still unacknowledged after the chosen time.
  - Email goes through your SMTP server (`SC_SMTP_*`). SMS goes through any HTTP SMS gateway (`SC_SMS_*`).
  - Every send is listed in the **Notification log**.

## Managing devices

The **Manage devices** page lists cameras and NVRs with Open, Edit, Activate/Deactivate, Reboot and Delete. It also has bulk CSV import, NVR channel import and ONVIF discovery.

- **Device details.** Each device records its make, model, serial number, firmware and MAC address, read from the device over ONVIF or Hikvision ISAPI. It also records its department, location path and branch, and its NVR and channel.
- **Status.** Each device shows whether it is active or deactivated, whether it is online or offline, and the exact error message when it is not working.
- **Reboot.** Uses ONVIF `SystemReboot`, with Hikvision ISAPI as a fallback. Every reboot is logged in the audit trail.
- **Troubleshoot** runs these checks and gives a plain fix for each one that fails:
  - network reachability to each port
  - the RTSP service
  - the ONVIF clock and login
  - the video stream (FPS, bitrate)
  - a picture check

## AI use cases

- **Catalog.** The **Use cases** page lists 184 built-in AI use cases across 13 sectors and 12 categories: cross-industry, logistics, IT/ITES, BPO, banking, branch operations, retail, pharma, hospitals, malls, railways, bus fleets and airports. It shows coverage against the requirement list (500 use cases in total).
- **Your own list.** The platform admin can import the remaining use cases by CSV.
- **What each use case needs.** Each one lists the AI models (for example face, ANPR, pose, PPE, ATM tamper) and the integrations (for example POS, token queue, roster, access control) it requires. It shows **Available** only when everything it needs is marked installed on **Models & integrations**.
- **Rule-based use cases** can be switched on per camera, with a zone or line drawn on screen and settings such as time limits and counts. They run in the analytics engine on the edge box or GPU server, which reads them from `GET /api/edge/config`.
- **Rule types:** zone, line, count, loitering, occupancy, crowd density, object left, proximity, dwell time, required presence, tailgating, fall and speed.
- **Model-only and integration-only use cases** (face match, skimmer detection, POS reconciliation) produce their events directly from that model or integration, once it is connected.

## Adding real cameras

| Method | Where | Notes |
|---|---|---|
| Single camera | Manage devices → Cameras → Add camera | RTSP URL and/or ONVIF host |
| Bulk CSV | Manage devices → Bulk CSV import | The `location` column takes a location code, a full path such as `Corporate Office / West Region / Mumbai Branch`, or a unique name. Nothing is imported unless every row is valid |
| Whole NVR | NVRs → Add NVR, then Import NVR channels | Built-in RTSP paths for Hikvision, Dahua and CP Plus, or your own `{host}/{port}/{ch}` template |
| Auto-discovery | ONVIF discovery | WS-Discovery multicast. Only reaches the server's own network segment |

Set the camera **health driver**:

- `generic`: the full check. Sends an RTSP OPTIONS request, then uses ffprobe to measure FPS, bitrate, codec and resolution. It grabs a frame for image health (blur, blank, dark, frozen, view changed). It also reads clock drift and firmware over ONVIF. Needs FFmpeg on the server.
- `rtsp`: reachability only. Cheap enough for very large fleets.

The NVR drivers are:

- `tcp`: checks that the NVR's web port answers.
- `onvif`: also reads make, model, serial number, firmware and clock drift.
- `hikvision_isapi`: also reads disk status and storage. Confirm it on your firmware first; see VERIFICATION.md.

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
| `SC_PUBLIC_URL` | — | Address included as a link in alert emails |
| `SC_SMTP_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_FROM`, `_STARTTLS` | — | Email alerts. Empty host = email off, logged as "skipped" |
| `SC_SMS_URL`, `_METHOD`, `_BODY`, `_HEADERS` | — | SMS alerts through an HTTP gateway. `{phone}` and `{message}` are filled in. Empty URL = SMS off |

**Upgrading from v0.1:** the database layout changed (organizations and location tree). There is no migration tool yet, so start with a fresh database.

API documentation (OpenAPI) is at `/docs`. Note: the Swagger page itself loads its assets from a CDN, so on an air-gapped network use `/openapi.json` instead.
