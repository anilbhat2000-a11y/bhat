#!/bin/bash
# 3C ITS VisionOps - one-step installer for an Ubuntu 24.04 server.
# Run:  bash install-ubuntu.sh     (as a normal user that can use sudo)
# Safe to run again: it updates the code and keeps your settings and data.
set -e
BRANCH=claude/exciting-allen-yupmql
REPO=https://github.com/anilbhat2000-a11y/bhat.git
DIR=/opt/bhat
APP=$DIR/sentinelcore
PORT=8080
say() { echo; echo "=== $* ==="; }

say "1/8 Installing system packages"
sudo apt-get update
sudo apt-get install -y python3 python3-venv ffmpeg git curl

say "2/8 Checking Python"
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "This server has $(python3 --version). VisionOps needs Python 3.11 or newer."
  echo "Use Ubuntu 24.04 LTS, or ask support for the extra step for older Ubuntu."
  exit 1
fi
python3 --version

say "3/8 Creating the service account 'sentinel'"
id sentinel >/dev/null 2>&1 || sudo useradd -r -s /usr/sbin/nologin sentinel

say "4/8 Downloading the portal to $DIR"
if [ -d "$DIR/.git" ]; then
  sudo git -C "$DIR" fetch origin "$BRANCH"
  sudo git -C "$DIR" checkout "$BRANCH"
  sudo git -C "$DIR" pull --ff-only origin "$BRANCH"
else
  sudo git clone -b "$BRANCH" "$REPO" "$DIR"
fi

say "5/8 Installing Python packages"
sudo python3 -m venv "$APP/.venv"
sudo "$APP/.venv/bin/pip" install --upgrade pip
sudo "$APP/.venv/bin/pip" install -r "$APP/requirements.txt"

say "6/8 Settings (/etc/sentinelcore.env)"
if sudo test -f /etc/sentinelcore.env; then
  echo "Keeping your existing settings file."
else
  while true; do
    read -rsp "Choose the password for the portal's 'admin' user (8+ characters): " PW1; echo
    read -rsp "Type it again: " PW2; echo
    if [ "$PW1" != "$PW2" ]; then echo "They do not match, try again."; continue; fi
    if [ ${#PW1} -lt 8 ]; then echo "Use at least 8 characters."; continue; fi
    break
  done
  KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')
  printf 'SC_SECRET_KEY=%s\nSC_ADMIN_PASSWORD=%s\nSC_SEED_DEMO=0\nSC_DATABASE_URL=sqlite:///%s/sentinel.db\n' \
    "$KEY" "$PW1" "$APP" | sudo tee /etc/sentinelcore.env >/dev/null
  sudo chmod 600 /etc/sentinelcore.env
  unset PW1 PW2 KEY
fi
sudo chown -R sentinel:sentinel "$APP"

say "7/8 Installing the service (starts at boot, restarts if it stops)"
sudo tee /etc/systemd/system/sentinelcore.service >/dev/null <<EOF
[Unit]
Description=3C ITS VisionOps
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$APP
EnvironmentFile=/etc/sentinelcore.env
ExecStart=$APP/.venv/bin/python -m uvicorn sentinel.main:app --host 0.0.0.0 --port $PORT
Restart=always
RestartSec=5
User=sentinel

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable sentinelcore
sudo systemctl restart sentinelcore
if command -v ufw >/dev/null && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow $PORT/tcp
fi

say "8/8 Checking that VisionOps answers"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then
    IP=$(hostname -I | awk '{print $1}')
    echo
    echo "VisionOps is running."
    echo "Open it from any PC on your network:  http://$IP:$PORT"
    echo "Sign in as: admin   (with the password you chose; on a re-run, your existing password)"
    exit 0
  fi
  sleep 2
done
echo "VisionOps did not answer within 60 seconds. Last log lines:"
sudo journalctl -u sentinelcore -n 40 --no-pager
exit 1
