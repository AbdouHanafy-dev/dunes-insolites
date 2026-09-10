#!/usr/bin/env bash
#
# "A backup that has never been restored is not a backup."
#
# Restores the most recent duneinsolite archive into a THROWAWAY database,
# runs sanity checks, prints a PASS/FAIL, and drops the throwaway. Safe to run
# from cron right after db-backup.sh - it never touches a live database.
#
#   ./scripts/db-restore-verify.sh [BACKUP_DIR]
#
# Environment: PGHOST PGPORT PGUSER PGPASSWORD.
#
set -euo pipefail

BACKUP_DIR="${1:-${BACKUP_DIR:-./backups/postgres}}"
PGHOST="${PGHOST:-localhost}"; PGPORT="${PGPORT:-5434}"; PGUSER="${PGUSER:-postgres}"
if [ -z "${PGPASSWORD:-}" ]; then echo "verify: PGPASSWORD must be set" >&2; exit 2; fi
export PGPASSWORD PGHOST PGPORT PGUSER

# Off-host restore drill: if OFFSITE_FETCH_CMD is set, pull the latest archive
# back FROM the off-host destination into $BACKUP_DIR first, so this verifies
# "the copy we could actually recover from after losing this host", not just a
# local dump. The command receives $BACKUP_DIR as $1 and must place at least
# one duneinsolite_*.dump (+ .sha256) there. Example:
#   OFFSITE_FETCH_CMD='rclone copy remote:dunes-backups "$1" --include "duneinsolite_*"'
if [ -n "${OFFSITE_FETCH_CMD:-}" ]; then
  echo "verify: fetching latest archive from off-host into $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  sh -c "$OFFSITE_FETCH_CMD" _ "$BACKUP_DIR" || { echo "verify: OFF-HOST FETCH FAILED" >&2; exit 1; }
fi

LATEST="$(ls -1t "$BACKUP_DIR"/duneinsolite_*.dump "$BACKUP_DIR"/duneinsolite_*.dump.enc 2>/dev/null | head -1 || true)"
[ -n "$LATEST" ] || { echo "verify: no duneinsolite_*.dump[.enc] in $BACKUP_DIR" >&2; exit 1; }

# If a checksum sidecar exists, verify integrity before attempting a restore.
if [ -f "$LATEST.sha256" ]; then
  echo "verify: checking sha256 of $LATEST"
  ( cd "$(dirname "$LATEST")" && (sha256sum -c "$(basename "$LATEST").sha256" 2>/dev/null \
      || shasum -a 256 -c "$(basename "$LATEST").sha256") ) \
    || { echo "verify: CHECKSUM MISMATCH for $LATEST" >&2; exit 1; }
fi

# Decrypt an encrypted archive to a temp plaintext dump for the restore test.
DECRYPTED=""
case "$LATEST" in
  *.enc)
    [ -n "${BACKUP_ENC_KEY_FILE:-}" ] && [ -r "$BACKUP_ENC_KEY_FILE" ] \
      || { echo "verify: $LATEST is encrypted but BACKUP_ENC_KEY_FILE is not set/readable" >&2; exit 1; }
    DECRYPTED="$(mktemp "${TMPDIR:-/tmp}/dunes-verify-XXXXXX.dump")"
    echo "verify: decrypting $LATEST"
    openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$BACKUP_ENC_KEY_FILE" \
      -in "$LATEST" -out "$DECRYPTED" \
      || { echo "verify: DECRYPT FAILED for $LATEST (wrong key?)" >&2; rm -f "$DECRYPTED"; exit 1; }
    LATEST="$DECRYPTED"
    ;;
esac

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SCRATCH="duneinsolite_verify_${STAMP}"
cleanup() { psql --dbname=postgres -c "DROP DATABASE IF EXISTS \"$SCRATCH\";" >/dev/null 2>&1 || true; [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"; }
trap cleanup EXIT

echo "verify: restoring $LATEST -> $SCRATCH"
psql --dbname=postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$SCRATCH\";" >/dev/null
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$SCRATCH" "$LATEST"

q() { psql --dbname="$SCRATCH" -tAc "$1" | tr -d '[:space:]'; }

TABLES="$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
FLYWAY="$(q "SELECT count(*) FROM flyway_schema_history;")"
USERS="$(q "SELECT count(*) FROM users;")"
RES="$(q "SELECT count(*) FROM reservations;")"

echo "verify: tables=$TABLES  flyway_history_rows=$FLYWAY  users=$USERS  reservations=$RES"

FAIL=0
[ "${TABLES:-0}" -ge 50 ] || { echo "verify: FAIL - expected >= 50 tables, got $TABLES"; FAIL=1; }
[ "${FLYWAY:-0}" -ge 1 ]  || { echo "verify: FAIL - flyway_schema_history is empty"; FAIL=1; }

if [ "$FAIL" -eq 0 ]; then
  echo "verify: PASS  ($LATEST is restorable)"
else
  echo "verify: FAIL  ($LATEST did NOT restore cleanly)" >&2
  exit 1
fi
