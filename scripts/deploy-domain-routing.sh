#!/usr/bin/env bash
# Installs the reviewed hostname-only nginx changes on the production VPS.
# Run as root after staging the four files in STAGE_DIR. On any nginx test or
# reload failure, the previous vhosts and legacy symlink are restored.
set -Eeuo pipefail

STAGE_DIR="${STAGE_DIR:-/tmp/dunes-domain-routing-20261001}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/nginx-domain-routing-backup-${STAMP}"
VHOSTS=(
  www.dunesinsolites.com
  partner.dunesinsolites.com
  camping.dunesinsolites.com
  mon.dunesinsolites.com
)

for name in "${VHOSTS[@]}"; do
  test -s "${STAGE_DIR}/${name}"
  test -e "${NGINX_AVAILABLE}/${name}"
done

install -d -m 700 "${BACKUP_DIR}"
for name in "${VHOSTS[@]}"; do
  cp -a "${NGINX_AVAILABLE}/${name}" "${BACKUP_DIR}/${name}"
done

LEGACY_LINK="${NGINX_ENABLED}/bare-domain-redirect.conf"
LEGACY_LINK_MOVED=false
PUBLIC_ENABLED="${NGINX_ENABLED}/www.dunesinsolites.com"
PUBLIC_ENABLED_REPLACED=false

rollback() {
  echo "Deployment failed; restoring nginx files from ${BACKUP_DIR}" >&2
  for name in "${VHOSTS[@]}"; do
    cp -a "${BACKUP_DIR}/${name}" "${NGINX_AVAILABLE}/${name}"
  done
  if [[ "${LEGACY_LINK_MOVED}" == true ]]; then
    mv "${BACKUP_DIR}/bare-domain-redirect.conf" "${LEGACY_LINK}"
  fi
  if [[ "${PUBLIC_ENABLED_REPLACED}" == true ]]; then
    rm -f "${PUBLIC_ENABLED}"
    cp -a "${BACKUP_DIR}/www.dunesinsolites.com.enabled" "${PUBLIC_ENABLED}"
  fi
  nginx -t || true
}
trap rollback ERR

if test -e "${LEGACY_LINK}" || test -L "${LEGACY_LINK}"; then
  mv "${LEGACY_LINK}" "${BACKUP_DIR}/bare-domain-redirect.conf"
  LEGACY_LINK_MOVED=true
fi

if ! test -L "${PUBLIC_ENABLED}" || \
   [[ "$(readlink -f "${PUBLIC_ENABLED}")" != "${NGINX_AVAILABLE}/www.dunesinsolites.com" ]]; then
  cp -a "${PUBLIC_ENABLED}" "${BACKUP_DIR}/www.dunesinsolites.com.enabled"
  PUBLIC_ENABLED_REPLACED=true
  rm -f "${PUBLIC_ENABLED}"
  ln -s "${NGINX_AVAILABLE}/www.dunesinsolites.com" "${PUBLIC_ENABLED}"
fi

for name in "${VHOSTS[@]}"; do
  install -m 644 "${STAGE_DIR}/${name}" "${NGINX_AVAILABLE}/${name}"
done

nginx -t
systemctl reload nginx
trap - ERR

echo "Domain routing deployed. Backup: ${BACKUP_DIR}"
