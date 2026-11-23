# Status and verification

This report follows Section 11 of the build prompt: every claim is backed by a test or marked as not verified.

## Inputs assumed (Section 0 was left blank)

| Input | Assumed value | Change by |
|---|---|---|
| Cameras / sites | Any number. Demo: 48 cameras, 3 sites | — |
| Brands | Hikvision, Dahua, CP Plus RTSP templates; any brand via RTSP/ONVIF | Add a template or driver |
| GPU | None required for the server. AI runs in the edge/GPU worker | — |
| OS | Linux (tested on Linux, Python 3.13) | — |
| Privacy law | India, DPDP Act 2023 (see the gaps below) | — |
| Database | SQLite (dev) and PostgreSQL 16 (prod). **Both tested** | — |

## Tested here (`pytest -q`: 75 passed on SQLite; the earlier 63-test suite also passed on PostgreSQL 16)

### Dashboards, map and live view (v0.4)

| Feature | Evidence |
|---|---|
| Map coordinates: camera's own, else its location's, else the nearest location above; scoped to the user; cameras without coordinates counted | `test_map_coordinates_inherit_and_scope` |
| Live quality is limited by the organization default and the per-camera override; invalid values rejected; viewers cannot change settings | `test_quality_cap_follows_org_and_camera` |
| Live MJPEG stream through FFmpeg (simulated camera): multipart boundary, a JPEG frame, requested quality limited to the allowed level, live view audited | `test_live_stream_mjpeg_and_cap` |
| Stream limit (429), deactivated camera (409), other organization's camera (404) | `test_live_stream_limits` |
| FFmpeg process stops when the viewer disconnects | Checked after the test run and the browser tour: no FFmpeg processes left |
| Existing database upgraded in place (columns added, data kept, second run does nothing) | `test_existing_database_is_upgraded_in_place` |
| Alerts filtered to one device | `test_alerts_filter_by_device` |
| Drill-down from every overview tile, camera and NVR dashboard pages, map pop-ups, live panel, no JS errors | Browser tour and the guide capture script |

### Not verified (v0.4)

- **Live view from real cameras.** Only simulated cameras (FFmpeg test pattern) were streamed. The RTSP path, login and sub-stream must be checked per camera.
- **Data rates per quality** are rough guides; MJPEG size depends on the scene.
- **Map tiles** from a real tile server have not been tested (no network here). The offline grid mode is tested.
- **Scale:** MJPEG conversion uses server CPU for each viewer. For many viewers, use a media server such as MediaMTX.

### Earlier

### AI use cases (v0.3)

| Feature | Evidence |
|---|---|
| Catalog: 184 built-in use cases with unique keys, covering all 13 sectors and all 12 categories; every rule template is valid | `test_builtin_catalog_is_consistent` and a validation run over every entry |
| Status follows installed models and integrations; a use case cannot be switched on until everything it needs is installed; only the platform admin can mark things installed | `test_catalog_listing_and_status`, `test_enable_use_case_requires_model_then_works` |
| Switch on/off per camera with zone/line and settings; unknown settings rejected; viewers cannot change | `test_enable_use_case_requires_model_then_works` |
| Edge box gets only cameras in its location subtree, with stream login and use cases; the runner turns them into events named after the use case | `test_edge_config_and_runner_post_use_case_events` |
| Events counted by category | `test_edge_config_and_runner_post_use_case_events` |
| CSV import of use cases: validation, no overwriting of built-ins, all-or-nothing | `test_coverage_and_import` |
| New rules: proximity, dwell, required presence (two-person rule), tailgating, fall (box-shape heuristic), speed; event name override | `test_analytics.py` (7 new tests on synthetic tracks) |
| Tracker keeps identity through a sudden shape change or a fast move (foot-distance matching) | `test_fall_heuristic`, `test_speed_and_event_type_override` |
| UI: use cases, coverage, models page, zone editor, camera use cases; no JS errors | Manual Playwright run and the guide capture script |

### Not verified / not included (use cases)

- **Models are not included.** Roughly 75 catalog entries need specialised models (face, ANPR, OCR, pose, PPE, fire/smoke, weapon, ATM tamper, shelf, defect inspection, aviation, driver monitoring). These must be sourced, installed and tested on your hardware and footage.
- **Integrations are not built.** About 40 entries need connectors to POS, token queue, roster/HRMS, access control, gate pass, parking, fare collection, ATM switch/EJ, vault alarm, fleet, AODB, MES/LIMS, WMS or HMS. Only the catalog tagging exists today.
- **Rule thresholds are untested on real footage.** Distance, speed and density values are in picture units and need calibration per camera. The fall rule is a box-shape heuristic; a pose model is more reliable.
- **Catalog size.** It holds 184 of the 500 use cases in the requirement list. The rest need the owner's full list (CSV import).
- **Heat maps and cross-camera person search** are listed as use cases but have no screen yet.

### Earlier features (v0.2)

### Organizations, hierarchy, approvals, contacts, maintenance (added in this round)

| Feature | Evidence |
|---|---|
| Organizations are isolated: devices, locations, users, contacts and audit log of one org are invisible to another | `test_org_isolation`, `test_audit_scoped_to_org`, `test_notifications_routing_and_escalation` |
| Access covers assigned location and everything under it; location filters include sub-locations | `test_hierarchy_scoping`, `test_health_summary_groups_by_branch` |
| Users can only hand out roles below their own, only within their own scope | `test_role_ladder_for_user_management` |
| Location tree: add, rename, no duplicates per level, no cycles, cannot delete own node or non-empty nodes | `test_location_management` |
| Approval: branch admin's change waits; peers and requester cannot approve; a regional manager or org admin can; rejection leaves nothing changed; orgs without approval apply directly | `test_approval_workflow` |
| Alert contacts: phone and email validation, scope, routing to a location and everything under it, severity filter, escalation after a delay, never sent twice, every attempt logged | `test_contacts_validation_and_scope`, `test_notifications_routing_and_escalation` |
| SMS gateway request (URL encoding, JSON escaping, headers) | `test_sms_gateway_request_building` (mock HTTP server) |
| Unconfigured email/SMS is logged as "skipped", not silently dropped | `test_notification_channels_not_configured_are_logged_as_skipped` |
| Make/model/serial/firmware stored from device readings; department saved; activate/deactivate closes alerts; deactivation by a location admin needs approval | `test_identity_status_reboot_troubleshoot` |
| Reboot permission (operators cannot), simulated reboot takes the device offline, troubleshoot reports it | `test_identity_status_reboot_troubleshoot` |
| Troubleshoot on an unreachable camera reports the failing network step with a fix, and stores the error message | `test_troubleshoot_real_driver_reports_network_failure` |
| CSV locations by code and full path; ambiguous names rejected | `test_csv_location_by_code_path_and_ambiguity`, `test_csv_import_by_path_and_code` |
| Edge boxes may only post events for cameras in their location subtree | `test_edge_ingest_within_subtree` |
| UI as super admin, org-level manager, branch admin and regional approver, desktop and phone, no JS errors | Manual Playwright tour against the demo |

### Earlier features

| Feature | Status | Evidence |
|---|---|---|
| Login, JWT, HttpOnly cookie, brute-force throttle | Done | `test_api::test_login_failures_and_lockout`, `test_requires_auth` |
| 5 roles + per-site scoping (out-of-scope devices return 404) | Done | `test_site_scoping`, `test_role_permissions`, `test_alert_ack_flow_and_scope` |
| Device passwords encrypted, never returned by the API | Done | `test_password_never_returned`, `test_onboarding::test_csv_dry_run_then_import_and_scope` |
| Bulk CSV import (validate all rows, all-or-nothing, dry run, site permission) | Done | `test_onboarding::test_csv_*`, `test_api::test_csv_import_endpoint` |
| NVR channel import (Hikvision/Dahua/custom templates, skips existing) | Done | `test_nvr_channel_import_skips_existing`, `test_channel_url_templates` |
| ONVIF WS-Discovery: probe message and ProbeMatch parsing | Done (parsing) | `test_parse_probe_match`. A live multicast run was **not** possible here |
| RTSP OPTIONS probe (200/401 = alive, non-RTSP/closed = down) | Done | `test_rtsp_options_*` against a local fake RTSP server |
| ffprobe measurement of FPS, bitrate, codec, resolution | Done | `test_probe_stream_measures_fps_and_bitrate`: a 25 fps test video measures 24–26 fps |
| Image health: dark, blank, blur, frozen, view changed | Done | `test_frame_grab_and_image_health`, `test_blur_detected` (real FFmpeg frames) |
| ONVIF GetSystemDateAndTime / GetDeviceInformation parsing; WS-UsernameToken digest | Done (parsing) | `test_parse_onvif_responses`, `test_ws_username_token_digest` |
| Hikvision ISAPI deviceInfo / Storage parsing | Done (parsing) | `test_parse_isapi_storage_and_summary` |
| A crashing or unknown driver never stops the collector | Done | `test_unknown_driver_and_crashing_driver_never_raise` |
| Alert rules: duration, no duplicate alerts, auto-resolve, missing metric ignored | Done | `test_alerts::test_duration_then_auto_resolve` |
| Collector → device state → metrics → dashboards | Done | `test_collector_health_summary_and_alerts` |
| Analytics rules: intrusion, line direction, counting, loitering, occupancy, object left, filters | Done | `test_analytics.py` (11 tests on synthetic tracks) |
| Edge ingest with hashed API keys; true/false review; false-alarm % | Done | `test_edge_ingest_and_event_handling` |
| Audit log of logins, changes, acknowledgements, reviews | Done | `test_admin_cannot_demote_self_and_audit_logged` |
| UI served with strict CSP (no external origins) | Done | `test_ui_served_with_csp` |
| UI renders with no JS errors (desktop 1440 px and phone 390 px, no horizontal scroll) | Done | Manual Playwright run against the demo server |
| Launcher: settings file, port check, start, restart after crash, stop | Done (Linux) | `test_launcher.py` |
| Launcher health check ignores proxy settings (company PCs) | Done | `test_health_check_ignores_proxy_settings` |
| Diagnostics report (`--diagnose`, logs/diagnose.txt) | Done | `test_diagnose_writes_report` |

## Written but NOT verified against real hardware (additions)

- **Reboot:** ONVIF `SystemReboot` and Hikvision ISAPI `PUT /ISAPI/System/reboot`. Try it on one device during a maintenance window first.
- **`onvif` NVR driver** and reading the serial number and MAC address from real devices.
- **Email delivery** through your SMTP server (only the logic was tested, with sending mocked).
- **Windows launcher parts:** the .bat files, background (detached) start, stopping an old frozen VisionOps that holds the port (netstat/tasklist), and start at sign-in. Logic is shared with the tested Linux path, but these have not been run on a Windows PC.
- **SMS delivery** through your gateway. Tested against a mock HTTP server only; set `SC_SMS_BODY`/`SC_SMS_HEADERS` to your provider's format.

## Written but NOT verified against real hardware

You need to check these on site. **Do not rely on them until you have.**

1. **Live cameras:** `generic` driver against real cameras (RTSP + ONVIF auth). Only fake servers and local files were used here.
2. **Hikvision ISAPI on a real NVR:** run
   `curl --digest -u admin:PASS http://NVR/ISAPI/ContentMgmt/Storage`
   and compare the output with the NVR Status page.
3. **RTSP URL templates:** confirm each template opens in VLC for your camera and NVR models.
4. **`OnnxYoloDetector`** (`analytics/detectors.py`): written to the YOLOv8 ONNX output layout but never run here, because there was no model and no GPU.
5. **Docker image and `docker-compose.yml`:** not built, because there was no Docker daemon here. The app was tested directly on PostgreSQL 16 instead.
6. **ONVIF discovery** on a real camera VLAN.

## Not done yet (next phases from the build prompt)

- **Database migrations:** no migration tool yet. v0.1 databases must be recreated.
- **Multi-level approval chains:** for example, branch to region to corporate in sequence. Today a single approval from any level above is enough.
- **Approvals for other changes:** location, user and contact changes apply directly and are audited; only device changes go through approval.
- **Recovery notifications:** contacts are not yet told when an alert resolves.
- **WhatsApp notifications.

- **Live view:** video wall and WebRTC/HLS (needs MediaMTX), recording, playback, evidence export.
- **Advanced AI:** face recognition, ANPR, PPE, slip & fall, heat maps, anomaly detection, forensic search.
  - Event types for these are accepted from edge devices, and the demo data includes them.
  - The models themselves are not included.
- **Edge-side event confirmation and deterrence:** double-confirm (edge + server) and active deterrence outputs (siren, strobe, relay).
- **Integrations:** BMS (BACnet/Modbus), access control, fire alarm, PA, SMS/WhatsApp/email notifications, webhooks/MQTT.
- **Accounts and sign-in:** LDAP/AD single sign-on and TOTP multi-factor authentication.
- **Reports:** scheduled PDF/Excel reports.
- **Zone editor:** zones are set through `PUT /api/cameras/{id}/analytics` today; there is no drawing editor on the live image yet.
- **Vendor battery drivers:** needs the battery camera models you use.
- **Dahua NVR health driver.**
- **Evaluation harness:** labelling tool and offline precision/recall evaluator (Section 8).
- **Privacy and DPDP Act features:**
  - privacy masks and face blurring
  - per-data-type retention
  - consent records and an erasure workflow for enrolled faces
- **Performance tests:** 72-hour soak and load tests (acceptance criteria in Section 9).
