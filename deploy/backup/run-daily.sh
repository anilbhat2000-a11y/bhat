#!/usr/bin/env bash
# Runs backup.sh once a day at BACKUP_AT (HH:MM, server local time, default 02:00).
# Used as the command of the backup container.
set -uo pipefail
at="${BACKUP_AT:-02:00}"
while true; do
  now=$(date +%s)
  next=$(date -d "today $at" +%s)
  [ "$next" -le "$now" ] && next=$(date -d "tomorrow $at" +%s)
  echo "backup: next run at $(date -d "@$next")"
  sleep $(( next - now ))
  /usr/local/bin/backup.sh || echo "backup: FAILED at $(date)" >&2
done
