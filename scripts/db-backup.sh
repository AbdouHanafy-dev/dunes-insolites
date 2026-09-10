#!/usr/bin/env bash
#
# PostgreSQL logical backup for Dune Insolite.
#
# Produces a compressed pg_dump custom-format archive per database, timestamped,
# and prunes archives older than the retention window. Designed to run from cron
# on the database host (or the docker-compose.backup.yml sidecar).
#
#   ./scripts/db-backup.sh
#
# Environment (all optional; defaults suit the docker-compose stack):
#   PGHOST                default: localhost
#   PGPORT                default: 5434            (docker-compose.yml host mapping)
#   PGUSER                default: postgres
#   PGPASSWORD            REQUIRED - no default, never hardcode it
#   BACKUP_DATABASES      default: "duneinsolite keycloak_db"
#   BACKUP_DIR            default: ./backups/postgres
#   RETENTION_DAYS        default: 14
#   OFFSITE_CMD           optional shell command run after each dump with the
#                         archive path as $1 (e.g. an aws s3 cp / rclone copy).
#
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5434}"
PGUSER="${PGUSER:-postgres}"
BACKUP_DATABASES="${BACKUP_DATABASES:-duneinsolite keycloak_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "db-backup: PGPASSWORD must be set (do not hardcode it)" >&2
  exit 2
fi
export PGPASSWORD PGHOST PGPORT PGUSER

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FAILED=0

for db in $BACKUP_DATABASES; do
  out="$BACKUP_DIR/${db}_${STAMP}.dump"
  echo "db-backup: dumping $db -> $out"
  if pg_dump --format=custom --no-owner --no-privileges --compress=9 \
             --dbname="$db" --file="$out.partial"; then
    mv "$out.partial" "$out"
    # Record the checksum against the BASENAME only, not "$out"'s absolute
    # path — otherwise `sha256sum -c` fails after the archive is pulled to a
    # different host/directory for an off-host restore (the exact DR scenario).
    ( cd "$BACKUP_DIR" && base="$(basename "$out")" \
        && { sha256sum "$base" > "$base.sha256" 2>/dev/null || shasum -a 256 "$base" > "$base.sha256"; } )
    echo "db-backup: wrote $(du -h "$out" | cut -f1) $out"
    if [ -n "${OFFSITE_CMD:-}" ]; then
      echo "db-backup: off-site copy of $out"
      # shellcheck disable=SC2086
      sh -c "$OFFSITE_CMD" _ "$out" "$out.sha256" || { echo "db-backup: OFF-SITE COPY FAILED for $out" >&2; FAILED=1; }
    fi
  else
    echo "db-backup: DUMP FAILED for $db" >&2
    rm -f "$out.partial"
    FAILED=1
  fi
done

echo "db-backup: pruning archives older than ${RETENTION_DAYS}d in $BACKUP_DIR"
find "$BACKUP_DIR" -name '*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete || true
find "$BACKUP_DIR" -name '*.sha256' -type f -mtime "+${RETENTION_DAYS}" -delete || true

if [ "$FAILED" -ne 0 ]; then
  echo "db-backup: completed WITH ERRORS" >&2
  exit 1
fi
echo "db-backup: OK"
