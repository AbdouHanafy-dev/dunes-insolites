#!/usr/bin/env bash
#
# Restore a pg_dump custom-format archive produced by db-backup.sh.
#
#   ./scripts/db-restore.sh <archive.dump> [target_db]
#
# target_db defaults to a NEW database named <archive-db>_restore_<stamp> so a
# careless run cannot clobber a live database. Restore into the live database
# only by passing its name explicitly AND confirming the prompt.
#
# Environment: PGHOST PGPORT PGUSER PGPASSWORD (see db-backup.sh).
#
set -euo pipefail

ARCHIVE="${1:?usage: db-restore.sh <archive.dump> [target_db]}"
[ -f "$ARCHIVE" ] || { echo "db-restore: not found: $ARCHIVE" >&2; exit 2; }

PGHOST="${PGHOST:-localhost}"; PGPORT="${PGPORT:-5434}"; PGUSER="${PGUSER:-postgres}"
if [ -z "${PGPASSWORD:-}" ]; then echo "db-restore: PGPASSWORD must be set" >&2; exit 2; fi
export PGPASSWORD PGHOST PGPORT PGUSER

# verify checksum if present
if [ -f "$ARCHIVE.sha256" ]; then
  echo "db-restore: verifying checksum"
  (cd "$(dirname "$ARCHIVE")" && (sha256sum -c "$(basename "$ARCHIVE").sha256" || shasum -a 256 -c "$(basename "$ARCHIVE").sha256"))
fi

SRC_DB="$(basename "$ARCHIVE" | sed -E 's/_[0-9]{8}T[0-9]{6}Z\.dump$//')"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${2:-${SRC_DB}_restore_${STAMP}}"

LIVE=0
case "$TARGET" in duneinsolite|keycloak_db) LIVE=1 ;; esac
if [ "$LIVE" -eq 1 ]; then
  echo "!! db-restore: TARGET '$TARGET' is a LIVE database. This will DROP and recreate it."
  printf "   Type the database name to confirm: "
  read -r confirm
  [ "$confirm" = "$TARGET" ] || { echo "db-restore: aborted"; exit 1; }
fi

echo "db-restore: (re)creating database $TARGET"
psql --dbname=postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$TARGET\";" -c "CREATE DATABASE \"$TARGET\";"

echo "db-restore: restoring $ARCHIVE -> $TARGET"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET" "$ARCHIVE"

echo "db-restore: done. Restored into '$TARGET'."
[ "$LIVE" -eq 0 ] && echo "   (throwaway DB — drop it with: psql -c 'DROP DATABASE \"$TARGET\";')"
