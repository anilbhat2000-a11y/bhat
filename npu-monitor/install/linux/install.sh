#!/usr/bin/env bash
# 3C ITS AI PC Health Checker & NPU Performance - Linux installer
#
#   ./install/linux/install.sh                      # install for this user, local access only
#   sudo ./install/linux/install.sh --service       # + start automatically at boot (systemd)
#   sudo ./install/linux/install.sh --service --network [--token SECRET] [--port 8765]
#   ./install/linux/install.sh --offline /path/to/wheels   # air-gapped install from a wheel folder
#
# Run from the application folder (the one that contains run.py), or from anywhere with the path.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT=8765; NETWORK=0; SERVICE=0; TOKEN=""; OFFLINE=""; PYTHON=""; RUN_USER="${SUDO_USER:-$(id -un)}"

usage() { sed -n '2,10p' "$0"; exit "${1:-0}"; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --network) NETWORK=1; shift ;;
    --token) TOKEN="$2"; shift 2 ;;
    --service) SERVICE=1; shift ;;
    --offline) OFFLINE="$2"; shift 2 ;;
    --python) PYTHON="$2"; shift 2 ;;
    --user) RUN_USER="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1"; usage 1 ;;
  esac
done

say()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*"; exit 1; }

say "3C ITS AI PC Health Checker - installing into $APP_DIR"
[[ -f "$APP_DIR/run.py" && -f "$APP_DIR/requirements.txt" ]] || die "run.py / requirements.txt not found in $APP_DIR"
[[ $SERVICE -eq 1 && $EUID -ne 0 ]] && die "--service needs root: re-run with sudo"

# --- 1. Python -------------------------------------------------------------------------------
if [[ -z "$PYTHON" ]]; then
  for c in python3.12 python3.11 python3.13 python3; do
    if command -v "$c" >/dev/null 2>&1; then PYTHON="$(command -v "$c")"; break; fi
  done
fi
[[ -n "$PYTHON" ]] || die "Python 3.11+ not found. Ubuntu/Debian: sudo apt install python3 python3-venv python3-pip   RHEL/Fedora: sudo dnf install python3 python3-pip"
PYV="$("$PYTHON" -c 'import sys,struct;print(f"{sys.version_info[0]}.{sys.version_info[1]} {struct.calcsize("P")*8}")')"
read -r PYVER PYBITS <<<"$PYV"
say "Using $PYTHON (Python $PYVER, ${PYBITS}-bit)"
[[ "$PYBITS" == "64" ]] || die "64-bit Python is required"
"$PYTHON" - <<'EOF' || die "Python 3.10 or newer is required (3.12 recommended)"
import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)
EOF
"$PYTHON" -m venv --help >/dev/null 2>&1 || die "Python venv module missing. Ubuntu/Debian: sudo apt install python3-venv"

# --- 2. virtual environment + packages ------------------------------------------------------------
VENV="$APP_DIR/.venv"
if [[ ! -x "$VENV/bin/python" ]]; then
  say "Creating virtual environment $VENV"
  "$PYTHON" -m venv "$VENV"
fi
PY="$VENV/bin/python"
say "Installing Python packages (this takes a few minutes the first time)"
if [[ -n "$OFFLINE" ]]; then
  "$PY" -m pip install --no-index --find-links "$OFFLINE" --upgrade pip || true
  "$PY" -m pip install --no-index --find-links "$OFFLINE" -r "$APP_DIR/requirements.txt"
else
  "$PY" -m pip install --upgrade pip
  "$PY" -m pip install -r "$APP_DIR/requirements.txt"
fi

# --- 3. NPU driver hint -----------------------------------------------------------------------------
CPU="$(grep -m1 -i 'model name' /proc/cpuinfo | cut -d: -f2- | sed 's/^ *//' || true)"
if echo "$CPU" | grep -qi 'core(tm) ultra'; then
  if ls /sys/class/accel/accel* >/dev/null 2>&1; then
    say "Intel NPU detected (/sys/class/accel) - hardware NPU counters will be used"
  else
    warn "Intel Core Ultra found but no NPU device. Install the Intel NPU driver (github.com/intel/linux-npu-driver/releases) on kernel 6.6+ and reboot."
  fi
elif echo "$CPU" | grep -qiE 'ryzen ai|ryzen [3579] (pro )?[78][0-9]40'; then
  warn "AMD Ryzen AI NPU: the NPU runtime (Ryzen AI Software) is Windows-only today. On Linux the app monitors CPU/GPU and estimates NPU use."
fi

# --- 4. data folders, prerequisite check ----------------------------------------------------------
mkdir -p "$APP_DIR/data" "$APP_DIR/reports" "$APP_DIR/models"
if [[ $EUID -eq 0 && "$RUN_USER" != "root" ]]; then chown -R "$RUN_USER": "$APP_DIR/data" "$APP_DIR/reports" "$APP_DIR/models" "$VENV"; fi
say "Checking prerequisites"
"$PY" "$APP_DIR/tools/check_prereqs.py" --port "$PORT" || true

# --- 5. optional systemd service --------------------------------------------------------------------
HOST=127.0.0.1
if [[ $NETWORK -eq 1 ]]; then
  HOST=0.0.0.0
  [[ -n "$TOKEN" ]] || TOKEN="$("$PY" -c 'import secrets;print(secrets.token_urlsafe(16))')"
fi
if [[ $SERVICE -eq 1 ]]; then
  UNIT=/etc/systemd/system/3cits-ai-pc.service
  ENVF=/etc/3cits-ai-pc.env
  say "Installing systemd service 3cits-ai-pc (runs as user '$RUN_USER')"
  umask 077
  printf 'NPU_MONITOR_TOKEN=%s\n' "$TOKEN" > "$ENVF"
  chmod 600 "$ENVF"
  cat > "$UNIT" <<EOF
[Unit]
Description=3C ITS AI PC Health Checker & NPU Performance
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=-$ENVF
# '+' runs with full privileges: lets the unprivileged service read the machine's serial numbers.
ExecStartPre=+/bin/sh -c 'chmod 0444 /sys/class/dmi/id/product_serial /sys/class/dmi/id/board_serial /sys/class/dmi/id/chassis_serial 2>/dev/null || true'
ExecStart=$PY $APP_DIR/run.py --no-browser --host $HOST --port $PORT
Restart=on-failure
RestartSec=5
SupplementaryGroups=video render

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now 3cits-ai-pc.service
  sleep 3
  systemctl --no-pager --lines=3 status 3cits-ai-pc.service || true
  if [[ $NETWORK -eq 1 ]]; then
    if command -v ufw >/dev/null 2>&1 && ufw status | grep -q active; then ufw allow "$PORT"/tcp comment '3C ITS AI PC Health Checker' || true; fi
    if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
      firewall-cmd --permanent --add-port="$PORT"/tcp && firewall-cmd --reload || true
    fi
  fi
fi

# --- 6. summary -----------------------------------------------------------------------------------
say "Installed."
echo "  Open:          http://localhost:$PORT   (create the administrator account on first visit)"
if [[ $SERVICE -eq 1 ]]; then
  echo "  Service:       sudo systemctl status|restart|stop 3cits-ai-pc"
  echo "  Logs:          journalctl -u 3cits-ai-pc -f"
else
  echo "  Start:         $PY $APP_DIR/run.py$([[ $NETWORK -eq 1 ]] && echo " --host 0.0.0.0 --token $TOKEN")"
fi
if [[ $NETWORK -eq 1 ]]; then
  IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo "  Portal access: http://${IP:-<this-ip>}:$PORT   machine token: $TOKEN"
fi
