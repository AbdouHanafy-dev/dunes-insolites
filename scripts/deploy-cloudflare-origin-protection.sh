#!/usr/bin/env bash
# Restricts the canonical customer HTTPS vhost to Cloudflare's published IPs.
# The API/admin/auth vhosts are deliberately untouched.
set -Eeuo pipefail

STAGE_DIR="${STAGE_DIR:-/tmp/dunes-cloudflare-origin-20261001}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_SNIPPETS="/etc/nginx/snippets"
VHOST="www.dunesinsolites.com"
SNIPPET="cloudflare-only.conf"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/nginx-cloudflare-origin-backup-${STAMP}"

test -s "${STAGE_DIR}/${VHOST}"
test -s "${STAGE_DIR}/${SNIPPET}"
test -e "${NGINX_AVAILABLE}/${VHOST}"

install -d -m 700 "${BACKUP_DIR}"
cp -a "${NGINX_AVAILABLE}/${VHOST}" "${BACKUP_DIR}/${VHOST}"
if test -e "${NGINX_SNIPPETS}/${SNIPPET}"; then
  cp -a "${NGINX_SNIPPETS}/${SNIPPET}" "${BACKUP_DIR}/${SNIPPET}"
  printf '%s\n' present > "${BACKUP_DIR}/snippet-state"
else
  printf '%s\n' absent > "${BACKUP_DIR}/snippet-state"
fi

rollback() {
  echo "Deployment failed; restoring nginx files from ${BACKUP_DIR}" >&2
  cp -a "${BACKUP_DIR}/${VHOST}" "${NGINX_AVAILABLE}/${VHOST}"
  if [[ "$(cat "${BACKUP_DIR}/snippet-state")" == present ]]; then
    cp -a "${BACKUP_DIR}/${SNIPPET}" "${NGINX_SNIPPETS}/${SNIPPET}"
  else
    rm -f "${NGINX_SNIPPETS:?}/${SNIPPET}"
  fi
  nginx -t || true
  systemctl reload nginx || true
}
trap rollback ERR

install -m 644 "${STAGE_DIR}/${SNIPPET}" "${NGINX_SNIPPETS}/${SNIPPET}"
install -m 644 "${STAGE_DIR}/${VHOST}" "${NGINX_AVAILABLE}/${VHOST}"

nginx -t
systemctl reload nginx

# Localhost is intentionally allowed so the origin can be health-checked.
curl --fail --silent --show-error \
  --resolve www.dunes-insolites.com:443:127.0.0.1 \
  https://www.dunes-insolites.com/ > /dev/null

trap - ERR
echo "Cloudflare origin protection deployed. Backup: ${BACKUP_DIR}"
