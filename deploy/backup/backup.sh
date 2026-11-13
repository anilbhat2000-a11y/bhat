#!/usr/bin/env bash
# Backs up the LMS database and uploaded files into one encrypted archive.
#
#   BACKUP_PASSPHRASE   required. AES-256 passphrase. Keep a copy somewhere safe: without it
#                       a backup cannot be restored.
#   PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE   database connection (standard libpq vars)
#   STORAGE_DIR         uploaded files directory (default /storage)
#   BACKUP_DIR          where archives are written (default /backups)
#   BACKUP_KEEP_DAYS    archives older than this are deleted (default 14)
#
# Writes BACKUP_DIR/lms-YYYYmmdd-HHMMSS.tar.gpg and a .sha256 file beside it.
set -euo pipefail

: "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE}"
STORAGE_DIR="${STORAGE_DIR:-/storage}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

stamp="$(date -u +%Y%m%d-%H%M%S)"
name="lms-${stamp}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$BACKUP_DIR" "$work/$name"

started=$(date +%s)
echo "backup: dumping database ${PGDATABASE:-}"
pg_dump --format=custom --no-owner --file="$work/$name/database.dump"

echo "backup: archiving files in $STORAGE_DIR"
if [ -d "$STORAGE_DIR" ]; then
  tar -C "$STORAGE_DIR" -cf "$work/$name/storage.tar" .
else
  tar -cf "$work/$name/storage.tar" --files-from /dev/null
fi

cat > "$work/$name/manifest.txt" <<EOF
created_utc=$stamp
database=${PGDATABASE:-}
format=pg_dump-custom+tar
EOF

echo "backup: encrypting"
tar -C "$work" -cf - "$name" \
  | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
        --symmetric --cipher-algo AES256 --compress-algo zlib \
        --output "$BACKUP_DIR/$name.tar.gpg.partial" 3<<<"$BACKUP_PASSPHRASE"
# Rename only when complete, so a half-written file never looks like a backup.
mv "$BACKUP_DIR/$name.tar.gpg.partial" "$BACKUP_DIR/$name.tar.gpg"
(cd "$BACKUP_DIR" && sha256sum "$name.tar.gpg" > "$name.tar.gpg.sha256")

find "$BACKUP_DIR" -maxdepth 1 -name 'lms-*.tar.gpg*' -mtime "+$BACKUP_KEEP_DAYS" -print -delete \
  | sed 's/^/backup: removed old /'

size=$(du -h "$BACKUP_DIR/$name.tar.gpg" | cut -f1)
echo "backup: wrote $BACKUP_DIR/$name.tar.gpg ($size) in $(( $(date +%s) - started ))s"
