#!/usr/bin/env bash
# Creates a self-signed certificate for the LMS in deploy/nginx/certs/.
#
#   deploy/nginx/make-cert.sh lms.3cit.local [10.0.0.25]
#
# Arguments: the host name users type, and optionally the server's LAN IP address.
# If your company has an internal certificate authority, ask it for a certificate instead,
# and save it as certs/lms.crt (full chain) and certs/lms.key.
set -euo pipefail
host="${1:?usage: make-cert.sh <hostname> [ip]}"
ip="${2:-}"
dir="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$dir"

san="DNS:${host}"
[ -n "$ip" ] && san="${san},IP:${ip}"

openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
  -keyout "$dir/lms.key" -out "$dir/lms.crt" \
  -subj "/CN=${host}/O=3C IT Solutions and Telecoms India Ltd" \
  -addext "subjectAltName=${san}"
chmod 600 "$dir/lms.key"
echo "Wrote $dir/lms.crt and $dir/lms.key (valid 825 days)."
echo "Install lms.crt as a trusted certificate on staff computers, or browsers will warn."
