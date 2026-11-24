#!/usr/bin/env bash
# First-time setup on a new server. Creates .env with strong random passwords and a
# self-signed HTTPS certificate, so nothing has to be edited by hand.
#
#   deploy/setup-server.sh <address staff will type> [server LAN IP]
#   deploy/setup-server.sh 192.168.1.50
#   deploy/setup-server.sh lms.3cit.local 192.168.1.50
#
# It never overwrites an existing .env (that holds the backup passphrase).
set -euo pipefail
cd "$(dirname "$0")/.."

host="${1:?usage: deploy/setup-server.sh <hostname or IP> [IP]}"
ip="${2:-}"
# An IP address given as the host is also the IP for the certificate.
if [ -z "$ip" ] && [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then ip="$host"; fi

if [ -f .env ]; then
  echo "setup: .env already exists, so it was left unchanged (it holds your passwords and backup passphrase)."
else
  rand() { openssl rand -hex 24; }
  db=$(rand); cron=$(rand); backup=$(rand)
  sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${db}|" \
      -e "s|^CRON_SECRET=.*|CRON_SECRET=${cron}|" \
      -e "s|^BACKUP_PASSPHRASE=.*|BACKUP_PASSPHRASE=${backup}|" \
      -e "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=https://${host}|" \
      .env.example > .env
  chmod 600 .env
  echo "setup: created .env with new random passwords."
  echo
  echo "  IMPORTANT - write this backup passphrase down and keep it somewhere safe (not on this server)."
  echo "  Without it, no backup can ever be restored:"
  echo
  echo "      ${backup}"
  echo
fi

if [ -f deploy/nginx/certs/lms.crt ] && [ -f deploy/nginx/certs/lms.key ]; then
  echo "setup: HTTPS certificate already exists, left unchanged."
else
  if [ -n "$ip" ]; then deploy/nginx/make-cert.sh "$host" "$ip"; else deploy/nginx/make-cert.sh "$host"; fi
fi
mkdir -p backups
echo "setup: done. Next: docker compose up -d --build"
