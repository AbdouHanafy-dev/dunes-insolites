# Runbook — PostgreSQL backup & restore

Built in production-hardening item 4.

## The three states — do not confuse them

| State | What it means | How we get there |
|---|---|---|
| **local backup** | a `pg_dump` archive exists on the DB host | `scripts/db-backup.sh` (cron or the `db-backup` sidecar) |
| **off-host backup** | that archive also exists somewhere the DB host cannot destroy | `OFFSITE_CMD` in `db-backup.sh` → S3 / rclone / scp. **Not configured yet — this is a launch task.** |
| **tested restore** | a backup was actually restored and verified, not just written | `scripts/db-restore-verify.sh` (run automatically by the sidecar after every backup) |

A local backup alone does **not** protect against host loss, disk failure, or
`rm -rf`. Off-host is mandatory before go-live.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/db-backup.sh` | `pg_dump -Fc` each database, timestamped, sha256, prune by `RETENTION_DAYS`, optional `OFFSITE_CMD` |
| `scripts/db-restore.sh <archive> [target_db]` | restore an archive — into a throwaway DB by default; into a live DB only with an explicit name + typed confirmation |
| `scripts/db-restore-verify.sh` | restore the latest archive into a throwaway DB, sanity-check it (table count, `flyway_schema_history`, key tables), drop it, print PASS/FAIL |

All read `PGHOST PGPORT PGUSER PGPASSWORD` from the environment. **No credential
is ever hardcoded or committed.**

### Verified

`db-backup.sh` + `db-restore-verify.sh` were run against the real database
(2 Sep 2026): dump → restore into a throwaway DB → `tables=62,
flyway_history=1, users=6, reservations=1` → PASS → throwaway dropped.

## Scheduled backups (docker-compose)

```bash
mkdir -p backend/backups/postgres
docker compose -f backend/docker-compose.yml -f backend/docker-compose.backup.yml up -d db-backup
```

The sidecar loops: backup → restore-verify → sleep `BACKUP_INTERVAL_SECONDS`
(default 24h). It writes to `backend/backups/postgres` **on the host** — set
`BACKUP_OFFSITE_CMD` to also push each archive off-host.

On a bare host instead of the sidecar, cron:

```cron
15 2 * * *  cd /opt/dune && PGPASSWORD=... ./scripts/db-backup.sh && ./scripts/db-restore-verify.sh
```

## Objectives

| | Target | Notes |
|---|---|---|
| **RPO** (max data loss) | ≤ 24h with daily backups | tighten with more frequent backups or WAL archiving (`archive_command` → off-host) if a lost booking-day is unacceptable |
| **RTO** (time to restore) | < 1h | `createdb` + `pg_restore` of a ~200 KB–few MB archive is minutes; most of the hour is diagnosis + redeploy |

## Restoring for real (disaster)

```bash
# 1. stop the backend so nothing writes mid-restore
docker compose -f backend/docker-compose.yml stop backend

# 2. restore (explicit live DB name + confirmation prompt)
PGPASSWORD=... ./scripts/db-restore.sh /path/to/duneinsolite_<stamp>.dump duneinsolite
# repeat for keycloak_db if Keycloak state was also lost

# 3. bring the backend back; Flyway sees the schema already at its version and
#    makes no changes; ddl-auto:validate confirms entities match.
docker compose -f backend/docker-compose.yml start backend

# 4. smoke test: POST /api/auth/login, GET /api/public/stays, check /actuator/health
```

## Off-host round-trip — mechanism proven (4 Sep 2026)

`backend/docker-compose.offsite.yml` adds a MinIO (S3-compatible) target and
wires `BACKUP_OFFSITE_CMD` / `OFFSITE_FETCH_CMD` to it via `mc`. Executed
end-to-end: `db-backup.sh` → push to a versioned bucket → **pull to a clean
recovery directory** → `db-restore-verify.sh` → sha256 `OK` → restore into a
throwaway DB → `tables=67 flyway_history_rows=8 users=8 reservations=3` →
**PASS**. This is a same-host MinIO, so it is a proof of the code path, **not**
real off-host protection — see `docs/runbooks/offsite-backup-setup.md`.

**Bug fixed on the way:** `db-backup.sh` wrote the `.sha256` with the archive's
*absolute* path, so `sha256sum -c` failed after the file was pulled to a
different directory/host (the exact DR scenario). It now records the basename.

## Follow-ups before go-live

- [ ] Point `BACKUP_OFFSITE_CMD` at a **real** bucket in another region/provider
      (versioning + object-lock) and confirm an archive + `.sha256` land there;
      run `db-restore-verify.sh` with `OFFSITE_FETCH_CMD` **from a second
      machine**. Checklist: `offsite-backup-setup.md`.
- [ ] Decide RPO: is daily enough, or is WAL archiving needed?
- [ ] Put a calendar reminder to review `db-restore-verify` output monthly.
