#!/usr/bin/env bash
# Re-captures every screenshot in the installation guide from a FRESH install.
# Usage (from sentinelcore/):  bash docs/install-guide/capture.sh [path/to/python-with-requirements]
# Needs: Python deps from requirements.txt, Node.js with Playwright + Chromium, FFmpeg (for WebP).
set -euo pipefail
cd "$(dirname "$0")/../.."
PY="${1:-python3}"
WORK="$(mktemp -d)"
PORT=8099
SC_DATABASE_URL="sqlite:///$WORK/guide.db" SC_SECRET_KEY="guide-capture-key-0123456789abcdef" \
SC_COLLECT_INTERVAL=5 "$PY" -m uvicorn sentinel.main:app --host 127.0.0.1 --port $PORT > "$WORK/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; rm -rf "$WORK"' EXIT
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null && break; sleep 0.5; done
PW="$(grep -o "password: [A-Za-z0-9_-]*" "$WORK/server.log" | awk '{print $2}')"
sed -E 's/password: [A-Za-z0-9_-]+/password: ••••••••••••••••/' "$WORK/server.log" | head -6 > docs/install-guide/first-start.log
BASE="http://127.0.0.1:$PORT" ADMIN_PW="$PW" OUT="docs/install-guide/img" node docs/install-guide/capture.js
# Convert to WebP (about a third of the size, still sharp for text).
for f in docs/install-guide/img/*.png; do
  ffmpeg -hide_banner -loglevel error -y -i "$f" -c:v libwebp -quality 88 "${f%.png}.webp" && rm "$f"
done
echo "Screenshots written to docs/install-guide/img"
