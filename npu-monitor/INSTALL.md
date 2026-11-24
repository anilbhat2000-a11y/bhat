<img src="npu_monitor/static/3c-its-logo.png" alt="3C ITS – Make IT Simple" height="56">

# Installation Guide
## 3C ITS AI PC Health Checker & NPU Performance

*We Care. We Build. We Transform.*

This guide is for the IT staff installing the software on a customer's **laptop, desktop, workstation or server**. Allow 15–30 minutes for the first machine and about 5 minutes for each one after that.

---

## Contents

1. [Choose a deployment](#1-choose-a-deployment)
2. [Prerequisites](#2-prerequisites)
3. [Get the software](#3-get-the-software)
4. [Install on Windows](#4-install-on-windows-laptop-desktop-or-server)
5. [Install on Linux](#5-install-on-linux-server-or-laptop)
6. [First sign-in](#6-first-sign-in)
7. [Add more machines to the portal](#7-add-more-machines-to-the-portal)
8. [Offline (air-gapped) installation](#8-offline-air-gapped-installation)
9. [Verify the installation](#9-verify-the-installation)
10. [Day-to-day operation](#10-day-to-day-operation)
11. [Security notes](#11-security-notes)
12. [Troubleshooting](#12-troubleshooting)
13. [Appendix: installer options](#13-appendix-installer-options)

---

## 1. Choose a deployment

| Deployment | Use it when | What to install |
|---|---|---|
| **A. Single machine** | Checking one laptop or PC (demos, pre-sales, a single user) | Install on that machine only (local access). |
| **B. Portal + machines** | Assessing several machines and ranking them together | Install on one **portal** machine (a server or an admin PC). Then install on each **machine** to be assessed and add it to the portal. |

```
                    ┌─────────────────────────────┐
  IT admin browser ─▶  Portal (server or admin PC) │  http://portal:8765
                    │  users · inventory · ranking │
                    └──────┬───────────┬──────────┘
                 TCP 8765  │           │  TCP 8765 (machine token)
                  ┌────────▼───┐   ┌───▼────────┐   ┌─────────────────────┐
                  │ AI laptop  │   │ Desktop     │   │ Machine without the │
                  │ (app runs) │   │ (app runs)  │   │ app: registered by  │
                  └────────────┘   └─────────────┘   │ hand in the portal  │
                                                     └─────────────────────┘
```

Every machine runs the same software, and any installation can act as the portal. Measurements always happen **on the machine being assessed**: NPU, battery and camera can't be measured remotely.

---

## 2. Prerequisites

### 2.1 Hardware

| | Minimum | Recommended |
|---|---|---|
| Processor | Any 64-bit x86-64 or ARM64 CPU | **AI PC** with an NPU: Intel Core Ultra (series 1, 2 or 3), AMD Ryzen AI (7040/8040, AI 300, AI Max) or Qualcomm Snapdragon X |
| Memory | 8 GB | 16 GB or more |
| Free disk | 3 GB | 5 GB (reports and history grow slowly) |
| Camera | Optional | Built-in webcam, for the live camera test |
| Battery | Optional | Laptops: needed for battery health, power and predictions |
| Portal server | 2 CPU cores, 4 GB RAM, 5 GB disk is a good starting point for an office fleet | Any always-on Windows or Linux machine reachable by the others |

Machines **without** an NPU are supported. They are assessed, flagged as **"Not an AI PC"**, and compared with the AI PCs.

### 2.2 Operating system

| OS | Support |
|---|---|
| **Windows 11** 23H2 or later (x64 or ARM64) | ✔ Recommended. Required for NPU counters (Task Manager-style NPU %) and current NPU drivers |
| Windows 10 22H2 (x64) | ✔ Works; NPU support depends on the vendor driver |
| Windows Server 2019 / 2022 / 2025 | ✔ As portal or as an assessed server (no NPU) |
| Ubuntu 22.04 / 24.04 LTS, Debian 12, RHEL / Rocky / Alma 9, Fedora 39+ | ✔ Kernel **6.6+** for the Intel NPU driver; older kernels work without NPU counters |
| macOS 13+ | ◐ Monitoring and inventory only; no NPU backend |

### 2.3 Software

| Item | Version | Notes |
|---|---|---|
| **Python** | **3.12 (64-bit)**; 3.11 also fine | Windows: from python.org, tick **"Add python.exe to PATH"**. **Snapdragon PCs: install the ARM64 build.** Avoid the Microsoft Store version on servers. |
| Web browser | Current Edge, Chrome or Firefox | Used to open the dashboard |
| Intel NPU driver | Latest "Intel NPU Driver" (shows as **Intel AI Boost**) | Windows Update or intel.com. Linux: `github.com/intel/linux-npu-driver` releases |
| AMD NPU | AMD NPU driver + **Ryzen AI Software** | Windows only. Install before the app, then use its Python (see §4.3) |
| Qualcomm NPU | Snapdragon NPU driver (pre-installed on Snapdragon PCs; keep Windows updated) | The installer adds `onnxruntime-qnn` automatically |
| GPU driver | Current vendor driver | Needed for GPU benchmarking and GPU counters |
| PowerShell | 5.1 (built into Windows) | For the Windows installer |

The installer adds all Python packages itself (FastAPI, OpenVINO, ONNX Runtime, OpenCV, PyMuPDF, openpyxl and so on). Nothing else needs installing by hand.

### 2.4 Network and firewall

| Purpose | Direction | Port | Needed |
|---|---|---|---|
| Dashboard in a browser on the same machine | local | TCP 8765 | Always (localhost only by default) |
| Portal ↔ machines | inbound on each **machine** and on the **portal** | TCP 8765 | Deployment B only. The installers add the rule (Domain/Private networks only on Windows) |
| Package download during installation | outbound HTTPS to `pypi.org` and `files.pythonhosted.org` | 443 | Only during installation. Use §8 for sites without internet |
| Anything at run time | — | — | **None.** The software never calls the internet; OpenVINO usage telemetry is switched off automatically |

The port can be changed with `-Port` / `--port`. Use the same port on all machines.

### 2.5 Accounts and permissions

| Task | Needs |
|---|---|
| Install Python and drivers | Local administrator |
| Run the installer for local use | A normal user account |
| `-Service`, `-Network` (Windows) or `--service` (Linux) | Administrator / `sudo` |
| Read serial numbers on Linux | root. The Linux service handles this automatically |
| Use the dashboard | An account created in the app (Administrator, Operator or Viewer) |

### 2.6 Pre-installation checklist

- [ ] Deployment chosen (A or B) and the portal machine identified
- [ ] Python 3.12 64-bit installed (ARM64 on Snapdragon)
- [ ] NPU and GPU drivers up to date (Device Manager shows **Neural processors → Intel AI Boost / AMD IPU / Qualcomm Hexagon**)
- [ ] 3 GB free disk; a folder the installer can write to (for example `C:\3CITS\ai-pc-health` or `/opt/3cits/ai-pc-health`)
- [ ] Internet for package download, **or** an offline wheel folder (§8)
- [ ] Deployment B: TCP 8765 allowed between portal and machines; a shared machine token decided

**Check automatically.** Once the software is copied (§3), run the prerequisite checker. It needs only Python:

```bash
python tools/check_prereqs.py
```

It prints `[ OK ]`, `[WARN]` or `[FAIL]` for the operating system, Python, NPU, memory, disk, write access, port, packages, AI runtime, camera and serial-number access, with a fix for each problem. Exit code: 0 = ready, 2 = ready with warnings, 1 = not ready. Use `--json` for deployment tools.

---

## 3. Get the software

Use any one of these:

* **ZIP from your 3C ITS contact:** unzip into the install folder.
* **Git:** clone the repository (command below); the application is in its `npu-monitor` folder.
* **USB / file share** for offline sites: copy the folder and the wheel folder from §8.

```bash
git clone -b claude/compassionate-tesla-s8dd25 https://github.com/anilbhat2000-a11y/bhat.git
```

The application folder contains `run.py`, `requirements.txt`, `INSTALL.md`, `install\` and `tools\`. Install from **inside this folder**.

---

## 4. Install on Windows (laptop, desktop or server)

### 4.1 Single machine (deployment A)

Open **PowerShell** in the application folder (Shift + right-click the folder → *Open in Terminal*) and run:

```bash
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1
```

The installer:

1. finds Python 3.12/3.11 and checks it is 64-bit (and ARM64 on Snapdragon)
2. creates a private environment in `.venv` and installs the packages
3. adds the correct NPU runtime for the processor (Snapdragon: `onnxruntime-qnn`; Intel: OpenVINO; AMD: see §4.3)
4. runs the prerequisite checker
5. creates `start.bat` and a desktop shortcut **"3C ITS AI PC Health Checker"**
6. starts the app and opens the browser

Next time, double-click **`start.bat`** to start the app, and use the desktop shortcut to open the dashboard.

### 4.2 Start automatically and join a portal (deployment B)

Open **PowerShell as Administrator** in the application folder:

```bash
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Service -Network
```

This also:

* creates a machine **token**, stored in `data\machine_token.txt` (readable only by Administrators and SYSTEM), and prints it
* adds a firewall rule for TCP 8765 on **Domain and Private** networks only
* registers a startup task **"3C ITS AI PC Health Checker"** (runs as SYSTEM, starts at boot, restarts on failure)

To use your own token, add `-Token YourSharedSecret`.

> The startup task runs in the background, so the **"Laptop camera (server)"** source may not see the webcam. Use **"Camera via browser"** in the dashboard instead; it works the same way and uses the browser's camera permission.

### 4.3 AMD Ryzen AI machines

1. Install the **AMD NPU driver** and **Ryzen AI Software** from AMD. This creates a Python environment, usually `C:\Users\<user>\miniforge3\envs\ryzen-ai-<version>\`.
2. Run the installer with that Python (command below). The installer detects AMD's NPU-enabled ONNX Runtime, reuses it, and doesn't overwrite it.

```bash
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Python "C:\Users\<user>\miniforge3\envs\ryzen-ai-<version>\python.exe"
```

Without Ryzen AI Software the app still installs and monitors the machine, but can't run AI work on the AMD NPU.

### 4.4 Snapdragon (Windows on ARM) machines

Install the **ARM64** build of Python 3.12. The installer refuses x64 Python on these PCs, because x64 Python can't reach the NPU. It then installs `onnxruntime-qnn` automatically.

---

## 5. Install on Linux (server or laptop)

In a terminal, in the application folder:

**Single machine, local access:**
```bash
./install/linux/install.sh
```

**Run as a service at boot and join a portal:**
```bash
sudo ./install/linux/install.sh --service --network --token YourSharedSecret
```

The installer:

1. finds Python 3.11+ (install it with `sudo apt install python3 python3-venv python3-pip` or `sudo dnf install python3 python3-pip`)
2. creates `.venv` and installs the packages
3. reports whether the Intel NPU driver is present (`/sys/class/accel`)
4. runs the prerequisite checker
5. with `--service`, creates the systemd service **`3cits-ai-pc`**. It runs as the installing user (not root); the token is kept in `/etc/3cits-ai-pc.env` (mode 600); the service makes the machine's serial numbers readable at start so the inventory is complete
6. with `--network`, opens TCP 8765 in `ufw` or `firewalld` if they are active

Service commands:

```bash
sudo systemctl status 3cits-ai-pc
```
```bash
sudo systemctl restart 3cits-ai-pc
```
```bash
journalctl -u 3cits-ai-pc -f
```

**Intel NPU on Linux:** install the driver packages from `github.com/intel/linux-npu-driver/releases` (kernel 6.6+), reboot, and add your user to the `render` group. The AMD NPU runtime is Windows-only today; on Linux the app monitors CPU/GPU and estimates NPU use.

---

## 6. First sign-in

1. On the installed machine, open **http://localhost:8765**. The 3C ITS landing page appears.
2. Click **Sign in**. On first use the page shows **Create administrator account**. Choose a username and a strong password (at least 10 characters, mixing letters with digits or symbols).
   *For security, this first account can only be created on the machine itself, not over the network.*
3. The dashboard opens. Check the header badges:
   * **Copilot+ AI PC / AI PC / Not an AI PC**
   * **NPU: hardware counter** (best) or **NPU: in-app estimate**
4. In **Admin panel → Users**, add accounts for colleagues:
   * **Viewer:** can look at dashboards and reports.
   * **Operator:** can also run tests.
   * **Administrator:** can also manage users, machines and security.

   New users choose their own password at first sign-in.
5. Optional: **⚙ Settings** for language (English, Hindi, Kannada, Tamil, Telugu), theme, font and text size.

**Optional, better labels.** The built-in AI model needs no download. For real image labels (ImageNet), run once on a machine with internet:

```bash
.venv\Scripts\python scripts\download_models.py
```

On Linux the command is `.venv/bin/python scripts/download_models.py`. Then copy the `models` folder to offline machines.

---

## 7. Add more machines to the portal

On the portal, open **Machines → + Add machine**. There are three ways:

| Method | When | Steps |
|---|---|---|
| **Enrolment code** (recommended) | Many machines | 1. Click **Create enrolment code** (valid 24 h, single use). 2. Install the app on the new machine (§4.1 or §5). 3. On that machine run the command the portal shows, e.g. `python run.py --enrol http://192.168.1.10:8765 --code ABCD-EFGH` (on Windows use `.venv\Scripts\python`). The machine appears in the portal within seconds. For permanent use, install that machine with `-Service -Network` / `--service --network`. |
| **Connect** | The machine already runs with `-Network` | Enter its address (`192.168.1.20:8765`) and its machine token. |
| **Register manually** | Machines that can't run the app | Enter name, type, make, model, serial number, asset tag, manufacturing date, owner and location. |

Then click **Run assessment on all machines**. All machines are benchmarked at the same time, ranked, and explained.

---

## 8. Offline (air-gapped) installation

On a machine **with** internet, using the same OS family, CPU architecture and Python version as the target:

```bash
python -m pip download -r requirements.txt pip -d wheels
```

For Snapdragon targets, also run `python -m pip download onnxruntime-qnn -d wheels`. The folder is about 250 MB.

Copy the application folder and the `wheels` folder to the target (USB or file share), then:

**Windows:**
```bash
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Offline D:\wheels
```
**Linux:**
```bash
./install/linux/install.sh --offline /media/usb/wheels
```

Python and drivers must already be installed from their offline installers.

---

## 9. Verify the installation

| Check | Expected |
|---|---|
| `python tools/check_prereqs.py` (with the `.venv` Python) | `READY` or `READY with warnings` |
| http://localhost:8765 | Landing page; **Sign in** works |
| Header badges | AI PC class and NPU source shown |
| **This machine** card | Manufacturer, model, serial number, estimated manufacturing date |
| **Run assessment** | Finishes in about 30 s with a 0–100 score and reasons |
| Laptop, on battery | Battery card shows charge, power draw (W) and health |
| Deployment B | All machines **online** (green dot) under **Machines** |
| After a reboot (service installs) | Dashboard reachable without logging on to Windows |

---

## 10. Day-to-day operation

| Task | Windows | Linux |
|---|---|---|
| Start / stop | `start.bat`; or Task Scheduler → *3C ITS AI PC Health Checker* (`Start-ScheduledTask` / `Stop-ScheduledTask`) | `sudo systemctl start` / `stop 3cits-ai-pc` |
| Logs | Console window of `start.bat` | `journalctl -u 3cits-ai-pc` |
| Update | Replace the application files (keep `data`, `reports`, `models`), then re-run `install.ps1` with the same options | Same, with `install.sh`, then `sudo systemctl restart 3cits-ai-pc` |
| Back up | Copy the `data` (users, inventory, battery history, settings) and `reports` folders | Same |
| Restore | Put `data` and `reports` back, then start the app | Same |
| Forgotten admin password | Stop the app, then `.venv\Scripts\python tools\reset_password.py --user admin`, then start it again. Other users and all data are kept. | `sudo systemctl stop 3cits-ai-pc`, then `sudo -u 3cits .venv/bin/python tools/reset_password.py --user admin`, then `sudo systemctl start 3cits-ai-pc` |
| Uninstall | `install\windows\uninstall.ps1` (add `-RemoveData` to delete data too), then delete the folder | `sudo ./install/linux/uninstall.sh [--remove-data]`, then delete the folder |

---

## 11. Security notes

* **Local by default:** without `-Network` / `--network` the app only listens on `127.0.0.1`.
* **Sign-in everywhere:** every page and API needs an account. Roles are enforced on the server. Passwords are stored as PBKDF2-SHA256 hashes. Sessions use HttpOnly, SameSite=Strict cookies. Repeated failed sign-ins lock the account for a few minutes. Everything is written to the **audit log** (Admin panel).
* **Machine token:** lets the portal read status and start assessments on a machine. It never grants user or admin rights. Keep it secret; change it by re-running the installer with `-Token` / `--token`.
* **Enrolment codes** are single-use, expire after 24 hours, and are stored only as hashes.
* **Traffic is plain HTTP.** Use it on a trusted LAN. For other networks, put the portal behind your HTTPS reverse proxy (IIS, nginx) or a VPN.
* **No data leaves the site.** Vendor telemetry is disabled automatically. Files uploaded for testing are processed in memory and not stored.

---

## 12. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Python ... not found` | Install Python 3.12 64-bit from python.org with *Add to PATH*, or pass `-Python` / `--python`. Avoid the Microsoft Store alias (`WindowsApps`). |
| `running scripts is disabled on this system` | Start the installer with `powershell -ExecutionPolicy Bypass -File ...` as shown. |
| Package installation fails | No internet or a proxy: set `HTTPS_PROXY`, or use the offline method (§8). |
| **NPU: in-app estimate** instead of hardware counter | Windows: update to Windows 11 and the latest NPU driver. Linux: Intel NPU driver on kernel 6.6+. The estimate is still correct for the app's own NPU work. |
| No NPU in the "Run on" list on an AI PC | Driver missing or outdated (check Device Manager → Neural processors). AMD: install Ryzen AI Software and §4.3. Snapdragon: ARM64 Python (§4.4). |
| Camera error with the server camera source | The camera is used by another app (Teams/Zoom), or privacy settings block desktop apps, or the app runs as a service. Use **Camera via browser**. |
| Battery power shows "—" | The laptop is plugged in; Windows only reports battery draw while discharging. Unplug for measurements. |
| Serial number shows "—" (Linux) | Run with `sudo`, or install with `--service`, which makes it readable. Some white-box PCs have no serial number in firmware. |
| Portal shows a machine **offline** | Machine not running with `-Network`; firewall/port 8765 blocked; wrong token; different port. Test with `curl http://<machine>:8765/` from the portal. |
| `Enrolment failed: invalid or expired code` | Create a new code; each code works once and expires after 24 hours. |
| `code accepted, but the portal could not reach the machine` | Inbound TCP 8765 blocked on the new machine. Re-run its installer with `-Network`, or open the port. |
| Port 8765 already in use | The app is already running (startup task), or another program uses the port. Stop it, or use `-Port 8766` on all machines. |
| Locked out after failed sign-ins | Wait the lockout time (default 5 minutes). Administrators can change it in Admin panel → Security. |

When contacting 3C ITS support, include the output of `python tools/check_prereqs.py --json` and, for Linux services, `journalctl -u 3cits-ai-pc --since today`.

---

## 13. Appendix: installer options

**Windows: `install\windows\install.ps1`**

| Option | Meaning |
|---|---|
| `-Service` | Start at boot (scheduled task as SYSTEM, restarts on failure). Administrator. |
| `-Network` | Listen on the LAN, create the machine token and firewall rule. Administrator. |
| `-Token <secret>` | Use this machine token instead of a generated one |
| `-Port <n>` | Port (default 8765) |
| `-Offline <folder>` | Install packages from a wheel folder (§8) |
| `-Python <path>` | Use this python.exe (AMD Ryzen AI environment, custom installs) |

**Linux: `install/linux/install.sh`**

| Option | Meaning |
|---|---|
| `--service` | Install and start the systemd service `3cits-ai-pc` (sudo) |
| `--network` | Listen on the LAN and open the firewall port |
| `--token <secret>` | Machine token (generated if omitted with `--network`) |
| `--port <n>` | Port (default 8765) |
| `--offline <folder>` | Install from a wheel folder |
| `--python <path>` | Use this Python interpreter |
| `--user <name>` | Account the service runs as (default: the user who ran sudo) |

**Application: `run.py`**

| Option | Meaning |
|---|---|
| `--host 0.0.0.0` | Listen on the LAN (needs a token) |
| `--port <n>` | Port |
| `--token <secret>` / `--token-file <path>` | Machine token |
| `--enrol <portal URL> --code <code> [--name <label>]` | Register this machine with a portal |
| `--no-browser` | Don't open the browser at start |

Environment variables (data folders, upload limits, webhook and more) are listed in `README.md`.
