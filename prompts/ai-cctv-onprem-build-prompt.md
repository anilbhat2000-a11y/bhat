# Master Prompt — On-Premise AI CCTV Centralization Platform

> Copy everything below the line into your AI coding assistant (Claude Code, Cursor, etc.).
> Fill in the `[[...]]` placeholders in Section 0 first. The prompt has strict rules, acceptance
> criteria and verification steps so the output can be checked, not just trusted.

---

## ROLE

You are a senior architect and full-stack engineer who has shipped video management systems (VMS),
computer-vision pipelines and industrial monitoring software. Build a production-grade,
**fully on-premise** (air-gap capable) AI video analytics platform called **"SentinelCore"** (rename
freely) that centralizes many CCTV cameras and NVRs from several sites into one system with AI
analytics, health monitoring, and User and Admin dashboards.

## 0. PROJECT INPUTS (fill these in before you start)

| Input | Value |
|---|---|
| Number of cameras at launch / at full scale | [[e.g. 64 / 1,000]] |
| Number of sites | [[e.g. 5]] |
| Camera brands / NVR brands in use | [[e.g. Hikvision, Dahua, CP Plus, Axis, Hanwha]] |
| Analog cameras present? | [[yes/no — if yes, via encoders]] |
| Battery / solar / 4G cameras present? | [[yes/no, models]] |
| GPU hardware available | [[e.g. 1× NVIDIA RTX A4000 server; 10× Jetson Orin Nano at edge]] |
| OS | [[Ubuntu 22.04 LTS]] |
| Country / privacy law | [[India — DPDP Act 2023; or GDPR, etc.]] |
| Integrations needed | [[BMS (BACnet/Modbus), access control, fire alarm, PA, SMS/WhatsApp/email]] |
| Language(s) of UI | [[English, Hindi]] |

**If a required input is missing, STOP and ask me. Do not guess hardware, brands, or laws.**

## 1. NON-NEGOTIABLE RULES (accuracy guardrails)

1. **No invented facts.** Do not invent APIs, SDK function names, library versions, camera
   endpoints, or performance numbers. If you are not sure an API exists, say so and give a way to
   verify it (link to docs, a test command).
2. **Pin every dependency** to an exact version you know exists. List them in one table.
3. **Every feature must have:** a data model, an API endpoint, a UI element, a test, and an
   acceptance criterion from Section 9. A feature missing any of these is not done.
4. **Accuracy claims must be measured, not stated.** Never write "99% accurate". Instead, build the
   evaluation harness in Section 8 and report precision, recall, F1 and false alarms per camera per
   day on my own labelled footage.
5. **On-premise only.** No cloud calls at runtime. No telemetry. Models, maps, fonts and libraries
   must be bundled or served locally. The system must run with the internet cable unplugged.
6. **Privacy by design** (Section 7) is a requirement, not an option.
7. Work in **phases** (Section 10). At the end of each phase, run the tests, show the output, and
   list what is done, what is not, and known risks. Do not claim something works without showing it.
8. When there are two reasonable choices, pick one, state why in one line, and move on.

## 2. ARCHITECTURE (six layers + hybrid edge/server)

Build this layered architecture and draw it as a Mermaid diagram in `docs/architecture.md`:

1. **Capture layer** — IP cameras, NVRs/DVRs, analog cameras through video encoders. Connect via
   **RTSP** (H.264/H.265) and **ONVIF Profile S/T** (discovery, stream URIs, PTZ, events) and
   **Profile G** where supported (edge recording retrieval). Also support vendor NVR channels through
   RTSP and ISAPI/HTTP APIs where documented.
2. **Ingestion & preprocessing** — stream manager that keeps one connection per camera and fans it
   out; hardware decoding (NVDEC / VA-API / Jetson NVDEC); frame sampling (configurable FPS per
   analytic, e.g. 5 fps for intrusion, 1 fps for occupancy); resize/normalize; automatic reconnect
   with exponential backoff; dual-stream use (sub-stream for AI, main-stream for recording/evidence).
3. **AI processing layer — hybrid:**
   - **Edge** (on-camera AI or Jetson/Intel NUC next to the cameras): low-latency alerts
     (intrusion, line crossing, loitering, fall). Sends only events + metadata + short clips upstream.
   - **Central server** (GPU): heavy and multi-camera work — face recognition, ANPR, cross-camera
     search, re-identification, heat maps, long-term analytics.
   - A single model registry pushes the same model versions to edge and server.
4. **Analytics engine** — detection → multi-object tracking (ByteTrack or similar) → classification
   → rule engine (zones, lines, dwell time, counts, schedules) → event generation with confidence
   score, snapshot, 10–30 s clip, and bounding boxes.
5. **Integration layer** — REST + WebSocket API (OpenAPI 3 spec), webhooks, MQTT, and connectors for
   BMS (BACnet/IP, Modbus TCP), access control (Wiegand/OSDP via controller APIs), fire alarm,
   PA system, SMS/email/WhatsApp gateways, and export to existing VMS (ONVIF events / Milestone,
   Genetec plugin stubs if requested).
6. **User interface** — web app for live view, alerts, playback, analytics, health, and admin.

**Suggested stack** (change only with a one-line reason):

| Area | Choice |
|---|---|
| Video pipeline | NVIDIA DeepStream (GPU) or GStreamer + FFmpeg; MediaMTX as RTSP/WebRTC relay |
| Models | YOLO-family detector (export to ONNX → TensorRT / OpenVINO), ArcFace-style face embeddings, an OCR model for plates (tuned for local plate formats, e.g. Indian HSRP) |
| Backend | Python FastAPI (AI services) + Go or Node for stream/health services |
| Messaging | NATS or Kafka (pick one) |
| Databases | PostgreSQL + TimescaleDB (events, metrics), pgvector (face/vehicle embeddings), Redis (cache, live state), MinIO (snapshots/clips, S3-compatible on-prem) |
| Frontend | React + TypeScript, WebRTC/HLS low-latency live view, charts library |
| Deploy | Docker Compose for single server; Kubernetes (k3s) for multi-node; offline installer |
| Monitoring | Prometheus + Grafana (internal), Loki for logs |

## 3. MULTI-CAMERA INTEGRATION (core requirement)

- Add cameras **at the same time, in bulk**: ONVIF auto-discovery on the LAN, CSV/Excel import,
  NVR import (pull all channels from an NVR in one step), and manual add.
- Group cameras by **Site → Building → Floor → Zone**; tag and search.
- Run many streams at once. Document the measured number of 1080p streams per GPU at the
  chosen FPS (measure it — do not quote a number you did not test).
- Video wall: 1/4/9/16/25/36 layouts, saved layouts, tours, and alarm pop-ups.
- Per-camera analytic assignment: each camera can run several analytics with its own zones,
  lines, schedules and sensitivity.
- Load balancing: assign streams to GPU workers automatically; move them if a worker fails.
- Smart codec / bandwidth: use sub-streams for AI, record main stream on event or continuously,
  support H.265 and smart-codec modes, and show bandwidth per camera and per site.

## 4. AI ANALYTICS FEATURES

Build each as a plugin with the same interface (config schema, inputs, outputs, events, metrics).

| # | Feature | Key behaviour |
|---|---|---|
| 1 | Human & vehicle classification | Person, car, bike, truck, bus; filter out animals, leaves, shadows, rain, headlights |
| 2 | Perimeter intrusion / line crossing | Polygon zones and direction-aware virtual lines, arm/disarm schedules |
| 3 | Active deterrence | Trigger camera siren/strobe/speaker, talk-down audio, or relay output on confirmed intrusion |
| 4 | Facial recognition | Enrol watch-list / allow-list, 1:N matching with configurable threshold, liveness check option, consent and retention controls |
| 5 | ANPR / LPR | Plate read + confidence, allow/block lists, entry/exit logs, local plate formats |
| 6 | People counting & occupancy | In/out counts per line, live occupancy per zone, max-capacity alerts |
| 7 | Heat mapping | Dwell and movement heat maps per hour/day/week |
| 8 | Loitering | Person in zone longer than N seconds |
| 9 | Object left behind / removed | Static-object detection with time threshold |
| 10 | Slip & fall | Pose-based fall detection with confirmation window |
| 11 | PPE detection | Helmet, vest, mask, gloves per zone rule |
| 12 | Crowd density & queue management | Density level, queue length, wait-time estimate, open-counter alerts |
| 13 | Anomaly detection | Unusual activity vs learned baseline per camera (time-of-day aware) |
| 14 | Camera tamper | Covered, defocused, moved, sprayed, scene change |
| 15 | Forensic search | Search across cameras by object type, colour, plate, face, time and zone |

**False-alarm reduction:** combine class filtering, minimum object size, tracking persistence
(object must exist for N frames), zone masks, schedules, and optional edge+server double
confirmation. Measure the false-alarm rate before and after on my footage and report it.

## 5. HEALTH MONITORING — CAMERA, BATTERY, NVR (core requirement)

Collect health data every 30–60 s (configurable) and store it as time series.

**Camera health**
- Online/offline (ping + RTSP probe + ONVIF GetSystemDateAndTime), uptime %, last seen.
- Stream health: actual FPS vs configured, bitrate, resolution, codec, packet loss, decode errors,
  latency.
- Image health: blur, too dark/bright, frozen frame, black/blank frame, tamper, view changed.
- Device info: model, firmware, MAC, IP, time drift vs NTP.

**Battery / power health** (for battery, solar and 4G cameras and UPS)
- Battery %, voltage, charge/discharge state, estimated time left, charge cycles, temperature,
  solar input, signal strength (4G/Wi-Fi), PoE port power where the switch exposes it (SNMP/LLDP).
- Get these values from vendor APIs/SNMP where available. **If a device does not expose a value,
  show "Not supported by device" — never show a fake or estimated value as real.**

**NVR / DVR / storage health**
- Online/offline, recording status per channel (recording / not recording / gap), HDD status per
  disk (healthy / error / full / SMART warnings), used and free space, estimated retention days,
  CPU/memory/temperature, firmware, channel count.
- Sources: ONVIF, SNMP, vendor HTTP APIs (e.g. Hikvision ISAPI, Dahua HTTP API) — verify each
  endpoint against the vendor docs and list which you verified.

**Server/edge health:** GPU use and temperature, CPU, RAM, disk, inference FPS, queue lag, model
version per node.

**Health alerts:** rules such as "camera offline > 5 min", "battery < 20%", "HDD error",
"recording stopped", "retention < 7 days", "time drift > 30 s". Escalation levels, quiet hours,
and auto-ticket creation (internal ticket list + email/SMS/webhook).

## 6. DASHBOARDS

**Role-based access control (RBAC):** Super Admin, Site Admin, Operator, Viewer, Auditor. Access
is limited by role **and** by site/camera group. SSO via LDAP/Active Directory, local users with
MFA (TOTP).

**User / Operator dashboard**
- Live video wall and alarm queue (acknowledge, assign, comment, close as true/false alarm).
- Event timeline with snapshot, clip, and box overlay; one-click export of evidence.
- Health summary for *their* cameras only: online/offline count, battery warnings, recording
  status.
- Map / floor-plan view with camera icons coloured by status and live alarms.

**Admin dashboard**
- Fleet health overview: totals and % online for cameras, NVRs, edge devices, servers; trends for
  7/30/90 days; worst-performing devices list.
- **Camera health table** (filter/sort/export): status, FPS, bitrate, image health, firmware,
  last seen.
- **Battery health panel**: battery %, trend chart, predicted days to replacement, low-battery list.
- **NVR status panel**: per-NVR disk health, storage use, retention days, recording gaps per channel.
- Analytics business intelligence: occupancy, footfall, heat maps, queue times, PPE compliance %,
  alarms per site, true vs false alarm ratio, operator response time.
- Configuration: cameras, NVRs, zones/lines editor drawn on the live image, schedules, analytics,
  models, users, roles, integrations, retention, backups.
- Audit log of every login, view, export, setting change and face/plate search.
- Reports: scheduled PDF/Excel reports (daily/weekly/monthly) by email on the local mail server.

## 7. SECURITY, PRIVACY & COMPLIANCE

- TLS everywhere, encrypted storage for faces/plates/clips (AES-256), secrets in a local vault,
  camera credentials never shown in the UI after save.
- Network isolation guidance: camera VLAN separate from office LAN.
- Privacy: face blurring/masking for viewers without rights, privacy zones, purpose-based access,
  data retention per data type (auto-delete), right-to-erasure workflow for enrolled faces, consent
  records for face enrolment, signage reminders.
- Compliance mapping table for the law in Section 0 (for India: **Digital Personal Data Protection
  Act 2023** — notice, consent, purpose limitation, retention, breach reporting). Say clearly that
  this is engineering guidance, not legal advice.
- Bias & limits: document known limits (night, rain, occlusion, masks, low resolution, camera
  angle) and show the confidence score on every event.

## 8. ACCURACY — EVALUATION HARNESS (how "accurate" is proven)

No model is 100% accurate in every condition. Accuracy must be **measured and tuned on site**:

1. Tool to tag sample clips from my cameras (day, night, rain, crowd) and export ground truth.
2. Offline evaluator that runs each analytic on the labelled set and reports precision, recall, F1,
   mAP (detection), plate-read accuracy (ANPR), FAR/FRR (face), count error % (people counting),
   and false alarms per camera per day.
3. Per-camera threshold tuning screen using these results.
4. Operator feedback loop: alarms closed as "false" feed a review queue for re-labelling and
   re-training/fine-tuning, with model versioning and rollback.
5. A short camera installation guide: recommended height, angle, pixels-per-face / pixels-per-plate,
   lighting/IR, FPS and resolution per analytic.

## 9. ACCEPTANCE CRITERIA (targets to test against; tune for your site)

- Add 50 cameras through ONVIF discovery or CSV in under 10 minutes.
- Camera offline detected and alerted within **2 minutes**; NVR HDD error within **5 minutes**.
- Edge intrusion alert end-to-end latency **< 2 s**; server analytics **< 5 s**.
- Live view start time **< 2 s** on LAN.
- Stream auto-reconnect after network loss with no manual action.
- Dashboard health values match the device's own web page (spot-check 10 devices; record results).
- Every event has snapshot, clip, confidence, camera, zone, timestamp (NTP-synced).
- System keeps running if one GPU worker dies (streams move within 60 s).
- Runs fully offline for 72 hours in a soak test with no memory leak (> 10% growth = fail).
- Detection metrics reported from Section 8 on my labelled data, with the targets I approve.

## 10. DELIVERY PHASES

1. **Phase 1 – Foundation:** repo structure, Docker Compose, DB schema, auth/RBAC, camera & NVR
   onboarding (ONVIF discovery, CSV, NVR import), live view, recording.
2. **Phase 2 – Health monitoring:** camera, battery, NVR, server health collectors, alerts, User and
   Admin health dashboards.
3. **Phase 3 – AI core:** pipeline, detector + tracker, rule engine, intrusion, line crossing,
   loitering, people counting, tamper, event/alarm workflow.
4. **Phase 4 – Advanced AI:** face recognition, ANPR, PPE, fall, object left/removed, crowd/queue,
   heat maps, anomaly, forensic search.
5. **Phase 5 – Integrations:** BMS (HVAC/lighting/elevator/cleaning by occupancy), access control,
   fire alarm, PA, notifications, VMS export, public API + SDK examples.
6. **Phase 6 – Hardening:** evaluation harness, security review, privacy features, load and soak
   tests, offline installer, backup/restore, admin and user manuals.

## 11. OUTPUT FORMAT FOR EACH PHASE

1. Short plan (what you will build and why).
2. File tree of new/changed files.
3. Full code (no placeholders like `// TODO implement`).
4. Database migrations and OpenAPI changes.
5. Tests, the exact command to run them, and their actual output.
6. Status table: feature | done/partial/not done | evidence (test name / screenshot) | known risk.
7. Questions that need my decision before the next phase.

Start with Phase 1. First, repeat back the Section 0 inputs and list any you need from me.
