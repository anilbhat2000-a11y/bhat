#!/usr/bin/env bash
# Restores an LMS backup made by backup.sh. This REPLACES the current database contents and
# uploaded files. Stop the app first (docker compose stop app scheduler).
#
#   restore.sh /backups/lms-YYYYmmdd-HHMMSS.tar.gpg [--yes]
#
# Uses the same variables as backup.sh (BACKUP_PASSPHRASE, PG*, STORAGE_DIR).
set -euo pipefail

archive="${1:?usage: restore.sh <archive.tar.gpg> [--yes]}"
confirm="${2:-}"
: "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE}"
STORAGE_DIR="${STORAGE_DIR:-/storage}"

[ -f "$archive" ] || { echo "restore: $archive not found" >&2; exit 1; }
if [ -f "$archive.sha256" ]; then
  (cd "$(dirname "$archive")" && sha256sum --check --quiet "$(basename "$archive").sha256") \
    || { echo "restore: checksum does not match; the file is damaged" >&2; exit 1; }
  echo "restore: checksum ok"
fi

if [ "$confirm" != "--yes" ]; then
  read -r -p "This replaces database '${PGDATABASE:-}' and all files in $STORAGE_DIR. Type RESTORE to continue: " answer
  [ "$answer" = "RESTORE" ] || { echo "restore: cancelled"; exit 1; }
fi

started=$(date +%s)
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "restore: decrypting"
gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$archive" 3<<<"$BACKUP_PASSPHRASE" \
  | tar -C "$work" -xf -
dir="$(find "$work" -mindepth 1 -maxdepth 1 -type d -name 'lms-*' | head -1)"
[ -f "$dir/database.dump" ] || { echo "restore: archive has no database.dump" >&2; exit 1; }

echo "restore: restoring database"
pg_restore --clean --if-exists --no-owner --single-transaction --dbname="${PGDATABASE:?set PGDATABASE}" "$dir/database.dump"

echo "restore: restoring files into $STORAGE_DIR"
mkdir -p "$STORAGE_DIR"
find "$STORAGE_DIR" -mindepth 1 -delete
tar -C "$STORAGE_DIR" -xf "$dir/storage.tar"

echo "restore: done in $(( $(date +%s) - started ))s. Start the app again (docker compose start app scheduler)."
