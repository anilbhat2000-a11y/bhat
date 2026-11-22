#!/usr/bin/env bash
# Removes the systemd service and virtual environment created by install.sh.
# Keeps users, reports and battery history unless --remove-data is given.
#   sudo ./install/linux/uninstall.sh [--remove-data]
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if systemctl list-unit-files 3cits-ai-pc.service >/dev/null 2>&1 && [[ -f /etc/systemd/system/3cits-ai-pc.service ]]; then
  [[ $EUID -eq 0 ]] || { echo "Run with sudo to remove the service."; exit 1; }
  systemctl disable --now 3cits-ai-pc.service || true
  rm -f /etc/systemd/system/3cits-ai-pc.service /etc/3cits-ai-pc.env
  systemctl daemon-reload
  echo "Removed systemd service."
fi
rm -rf "$APP_DIR/.venv"
if [[ "${1:-}" == "--remove-data" ]]; then rm -rf "$APP_DIR/data" "$APP_DIR/reports"; echo "Removed data and reports."
else echo "Kept $APP_DIR/data and $APP_DIR/reports (delete the folder to remove everything)."; fi
