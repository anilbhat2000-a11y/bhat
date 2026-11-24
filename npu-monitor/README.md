<img src="npu_monitor/static/3c-its-logo.png" alt="3C ITS – Make IT Simple" height="64">

# 3C ITS AI PC Health Checker & NPU Performance

An on-prem tool by 3C ITS.

> **We Care. We Build. We Transform.** Your technology, transformed with AI infrastructure.

A local, fully offline tool for AI laptops with a built-in NPU (Intel Core Ultra, AMD Ryzen AI, Qualcomm Snapdragon X). It:

* shows **NPU utilisation in real time**, with **CPU and GPU** on the same chart, so you can see what NPU work does to the other processors
* runs AI inference on the **NPU** (or GPU/CPU, to compare) against:
  * the **laptop camera**, read on the machine itself or through the browser
  * **screen and graphics capture**
  * uploaded **images (PNG/JPEG/…)**, **PDFs** (every page plus every embedded picture), **Excel** (each sheet drawn as a heat-mapped grid, plus embedded pictures and number stats) and **CSV**
* quantifies the **impact**: average CPU, CPU used by this app, GPU, memory and package power while the NPU is busy compared with idle, the Δ between them, and the correlation r
* includes a **benchmark** that runs the same model on NPU, GPU and CPU in turn after an idle baseline, recording throughput, latency and every processor's load
* **NPU suitability assessment**: scores the machine 0–100 and explains *why* it is (or isn't) good for NPU work, using the measured numbers, with a printable report
* **AI PC check**: classifies each machine as *Copilot+ AI PC* (NPU ≥ 40 TOPS), *AI PC* or *Not an AI PC*, and raises an alert when it isn't one
* **Battery and power**: charge, live power draw, health (capacity vs design), cycle count, temperatures
* **Predictive analysis**: time to empty or full, battery-health forecast (date it reaches 80 %), and modelled battery life, CPU/GPU load and battery cycles per year when the same AI workload runs on the NPU vs the GPU vs the CPU
* **Fleet mode**: connect laptops, desktops, workstations and servers, watch them live, run the assessment on all of them at once and get a ranking that explains why the winner is best
* **Alerts**: not an AI PC, NPU present but unusable, battery worn or low, AI running on the CPU while an NPU sits idle. Optional webhook.
* **Landing page** at `/` with the 3C ITS tagline and original vector illustrations of AI laptops, desktops, servers and the AI transformation (animated, theme-aware and translated)
* **Machine identity and inventory**: make, model, serial numbers, estimated manufacturing date, BIOS/UEFI, motherboard and asset tag for every machine. Add machines by connecting, by one-time enrolment code, or by manual registration, and export the inventory as CSV
* **Sign-in and user management**: login page, Admin / Operator / Viewer roles, admin panel for users, audit log and security settings
* **Display settings** per browser: theme (dark green, light green, high contrast, classic light), language (English, हिन्दी, ಕನ್ನಡ, தமிழ், తెలుగు), font, text size, background and font colour, bold, italic
* exports telemetry as CSV

Nothing leaves the machine. The server binds to `127.0.0.1` by default, and the dashboard has no CDN or internet dependencies.

## Quick start

**Installing for a customer? Follow [INSTALL.md](INSTALL.md)** (prerequisites, Windows and Linux installers, services, portal set-up, offline installs and troubleshooting). A printable copy is in `docs/3C-ITS-Installation-Guide.pdf`.


```bash
python -m venv .venv
```
```bash
# Windows: .venv\Scripts\activate
source .venv/bin/activate
```
```bash
pip install -r requirements.txt
```
```bash
python run.py
```

Your browser opens at http://localhost:8765. That's the public landing page; **Sign in** leads to the dashboard at `/app`.

### Install the backend for your NPU

| Laptop | NPU inference | NPU utilisation source |
|---|---|---|
| Intel Core Ultra | `openvino` (in requirements) | Linux: `intel_vpu` sysfs `npu_busy_time_us`; Windows: performance counters |
| AMD Ryzen AI | Ryzen AI Software (onnxruntime + Vitis AI EP) | Windows: performance counters; Linux: in-app estimate |
| Snapdragon X | `pip install onnxruntime-qnn` | Windows: performance counters |
| Any GPU | `onnxruntime-directml` (Windows) / `onnxruntime-gpu` (NVIDIA) | NVML, amdgpu/i915/xe sysfs, Windows counters |

The header badge always shows where the NPU number comes from:
* **hardware counter**: the OS or driver figure, which covers NPU load from *every* process (the same source as Task Manager on Windows).
* **in-app estimate**: shown when no counter can be read. It is the share of time this app kept the NPU busy.

If Windows picks the wrong adapter as the NPU, set `NPU_MONITOR_NPU_LUID=0x0000XXXX`.

### Model

Out of the box the app generates a **built-in CNN** locally. It needs no download, but it gives no meaningful labels. For real ImageNet classification, download once:

```bash
python scripts/download_models.py
```

On an air-gapped machine, copy `mobilenetv2-12.onnx` and `synset.txt` into `models/` instead. To use any other image-classification ONNX model, set `NPU_MONITOR_MODEL=/path/model.onnx`.

## Sign-in, users and roles

On first start, open **http://localhost:8765** on the machine itself and create the administrator account. Setup is only allowed from that computer. After that, everyone signs in.

| Role | Can |
|---|---|
| **Viewer** | see dashboards, battery data, reports and comparisons; export CSV |
| **Operator** | everything a viewer can, plus run assessments and benchmarks, start the camera or screen capture, and process documents |
| **Administrator** | everything, plus manage users, fleet machines and security settings (**Admin panel**) |

* New users and admin password resets get a **temporary password**, which must be changed at first sign-in.
* The server always refuses to remove, demote or disable the **last active administrator**. Admins can't change their own role or delete themselves.
* Passwords are stored as PBKDF2-SHA256 hashes (310 000 iterations) in `data/users.json`. Sessions use an HttpOnly, SameSite=Strict cookie and expire after the configured idle time. Restarting the app signs everyone out.
* After 5 failed sign-ins (configurable) for a username or address, sign-in is locked for 5 minutes.
* The **audit log** records sign-ins (including failures), user and security changes, assessments, fleet changes and camera starts.
* Forgotten admin password: stop the app and run `python tools/reset_password.py --user admin` on the server (Linux service: `sudo -u 3cits .venv/bin/python tools/reset_password.py --user admin`). Other users and all data are kept.

## Display settings and languages

Click **⚙ Settings** (also on the sign-in page) to choose the theme, language, font, text size (80–160 %), background colour, font colour, bold and italic. A preview shows the contrast ratio and warns below 4.5:1. Settings are saved per browser on that computer.

Languages: English, Hindi, Kannada, Tamil and Telugu cover all buttons, labels and help text. Analysis sentences generated from measurements (reasons, alerts, findings) stay in English. To add a language, add its code to `LANGS` and one more column to each row in `npu_monitor/static/i18n.js`. Please have translations reviewed by a native speaker before rolling them out.

## Machine identity and adding machines

**This machine** shows what the firmware reports:

| Field | Windows | Linux | macOS |
|---|---|---|---|
| Manufacturer, model, family/SKU | WMI `Win32_ComputerSystem` / `Win32_ComputerSystemProduct` | `/sys/class/dmi/id` | `system_profiler` |
| Serial number, UUID | WMI (no admin rights needed) | DMI (**needs sudo**; shown as such otherwise) | `system_profiler` |
| BIOS/UEFI version and date, motherboard, asset tag | WMI | DMI | boot ROM |

**Manufacturing date.** PCs don't store a standard "manufactured on" field, so the app shows an **estimate** and names its source and confidence. It uses the earliest of: the battery's factory date (laptops, *good*), the BIOS/UEFI release date (*approximate*, because a later BIOS update moves it forward), or the OS install date (*low*). Administrators can override it per machine with **Edit**. Placeholder values such as "To be filled by O.E.M." or "Default string" are ignored.

**Adding machines** (Machines → **+ Add machine**, administrators):

1. **Connect:** the machine already runs `python run.py --host 0.0.0.0 --token SECRET`. Enter its address and token.
2. **Enrolment code (best for many machines):** create a one-time code (valid 24 h). On the new machine run the command shown, for example
   ```bash
   python run.py --enrol http://192.168.1.10:8765 --code ABCD-EFGH
   ```
   The machine starts listening on the network with its own generated token, finds its LAN address and registers itself. Codes are single-use, stored only as hashes, and repeated wrong codes from one address are blocked.
3. **Register manually:** for machines that can't run the app. Enter name, type, make, model, serial number, asset tag, manufacturing date, owner and location.

Every machine can carry an owner, department, location and notes. **Export inventory (CSV)** downloads the full list. Machines running the app refresh their identity automatically.

## Fleet: several machines together

1. On **every** machine, start the app so the hub can reach it:
   ```bash
   python run.py --host 0.0.0.0 --token YourSharedSecret
   ```
   On Windows, allow the port through the firewall once (in an Administrator prompt):
   ```bash
   netsh advfirewall firewall add rule name="3C ITS AI PC Health Checker" dir=in action=allow protocol=TCP localport=8765
   ```
2. On the machine you want to view from (the hub), open the dashboard. In **Fleet**, add each machine as `IP:8765` with its token.
3. Click **Run assessment on all machines**. Every machine benchmarks at the same time, and you get a ranking, *why it is the best choice* and a flag on any machine that is not an AI PC.

Machines that aren't added to a hub can still be compared: download each machine's report JSON and use **Import report JSON** in *Compare laptops, PCs and servers*.

The fleet token lets a hub call only the status, assessment and job endpoints on a machine. It never grants user or admin access. People still sign in as users. The app refuses network requests if it has none, and `run.py` generates one when you bind to `0.0.0.0` without `--token`. Traffic is plain HTTP, so use it on a trusted LAN or put it behind your HTTPS reverse proxy.

## Battery, power and predictions

* **Power** comes from CPU package power (Linux RAPL) or, on laptops, the battery discharge rate (Windows WMI / Linux sysfs). Unplug the charger to measure battery draw. That is also when the assessment can show energy efficiency and battery-life gains.
* **Health** is full-charge capacity ÷ design capacity. Not every laptop reports cycle counts.
* **Forecasts** state their method on screen. The time-to-empty uses the discharge trend and the current draw. The 80 %-health date uses the daily health log (`data/battery_log.jsonl`) once a week of history exists, and before that the wear per cycle so far. The NPU impact model interpolates each processor's measured load and power to a 30 FPS AI camera.

## Privacy

Nothing is sent anywhere. The `openvino` pip package includes a telemetry module that sends usage statistics to Google Analytics unless an opt-out file exists. The app writes OpenVINO's own opt-out file (`~/intel/openvino_telemetry` = `0`) at start-up unless you already made a choice. Set `NPU_MONITOR_ALLOW_VENDOR_TELEMETRY=1` to skip this.

## Measuring the impact on CPU and GPU

1. Leave the machine idle for about 10 s so there is an idle baseline.
2. Start **Laptop camera** on the NPU device, or process documents with *Passes* set to 20 or more.
3. Read the **Impact** table. The *CPU (this app)* Δ is the CPU cost of feeding the NPU (decoding, resizing, pre- and post-processing). The GPU Δ shows whether the GPU was touched at all.
4. Run the **benchmark** with NPU, GPU and CPU ticked to see the same workload's cost on each processor.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `NPU_MONITOR_INTERVAL` | `0.5` | sampling period (s) |
| `NPU_MONITOR_MAX_UPLOAD_MB` | `200` | upload size cap |
| `NPU_MONITOR_MAX_PDF_PAGES` | `50` | pages rendered per PDF |
| `NPU_MONITOR_MODEL` | – | custom ONNX model |
| `NPU_MONITOR_NPU_LUID` | – | pin the Windows NPU adapter |
| `NPU_MONITOR_TOKEN` | – | token remote machines/hubs must send (same as `--token`) |
| `NPU_MONITOR_WEBHOOK` | – | URL to POST new alerts to (JSON) |
| `NPU_MONITOR_DATA` / `NPU_MONITOR_REPORTS` | `./data`, `./reports` | where fleet peers, battery log and reports are stored |

`--host 0.0.0.0` is only needed for fleet mode. Remote access then requires the token.

## API

`GET /api/system`, `GET /api/metrics`, `GET /api/history?seconds=`, `GET /api/impact?seconds=`, `GET /api/export.csv`, `WS /ws/metrics`, `POST /api/live/start|stop`, `GET /api/live/stream` (MJPEG), `POST /api/frame` (JPEG body), `POST /api/files` (multipart), `POST /api/benchmark`, `GET /api/jobs/{id}`, `POST /api/assessment`, `GET /api/reports[/{file}[/html]]`, `POST /api/compare`, `GET /api/node`, `GET /api/battery`, `GET /api/alerts`, `GET|POST /api/fleet…`.

## Tests

```bash
python -m pytest -q
```
