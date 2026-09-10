# Runbook — off-host backup setup (launch blocker)

**Status:** BLOCKED — `OFFSITE_CMD` / `BACKUP_OFFSITE_CMD` is not configured on any
host. The **code path exists and is tested** (`scripts/db-backup.sh` runs
`OFFSITE_CMD` after each dump; `scripts/db-restore-verify.sh` runs
`OFFSITE_FETCH_CMD` to pull an archive back and verify it). What is missing is a
real destination and a real archive proven to be off the DB host.

**Do not mark this blocker closed until step 6's evidence exists.**

## Purpose

A `pg_dump` archive sitting on the same host as the database protects against a
bad migration, not against host loss, disk failure, ransomware, or `rm -rf`.
Off-host is mandatory before go-live.

## Preconditions

- `scripts/db-backup.sh` + `db-restore-verify.sh` run green locally (they do — see
  `backup-restore.md` §Verified).
- A storage destination the DB host can **write** but a compromised DB host
  **cannot delete or overwrite history of** — object storage with versioning +
  object-lock, or a pull-based backup server. (Decision required — the repo does
  not choose a provider.)
- A credential for that destination, injected via environment / secret manager,
  **never committed**.

## Recommended architecture (not prescriptive)

| Option | Write path | Immutability | Notes |
|---|---|---|---|
| S3 (or compatible) + versioning + Object Lock (compliance mode, e.g. 35 days) | `aws s3 cp` in `OFFSITE_CMD` | strong | simplest to reason about; region separate from the app |
| `rclone` to a versioned remote | `rclone copy` | provider-dependent | good if already using rclone |
| Pull-based (backup server `rsync`/`borg` pulls from the DB host) | n/a (DB host has no delete rights) | strong | more infra to run |

Encryption: the dump is not encrypted at rest by `pg_dump`. Either enable
server-side encryption on the bucket **and** client-side encrypt before upload
(`age` / `gpg` in `OFFSITE_CMD`), or accept SSE-only and document that choice.
The decryption key must not live on the DB host.

Retention: align with the accounting/legal retention decision (OPEN-QUESTIONS /
F-5.2) — **do not invent a number here.** Interim: keep ≥ 35 daily + 3 monthly
until F-5.2 lands.

## Steps

1. Provision the destination + a scoped write-only credential.
2. On the DB host, set in the backup environment (compose `.env` for the
   `db-backup` sidecar, or the cron shell):
   ```sh
   BACKUP_OFFSITE_CMD='aws s3 cp "$1" s3://<bucket>/pg/ && aws s3 cp "$2" s3://<bucket>/pg/'
   OFFSITE_FETCH_CMD='aws s3 cp s3://<bucket>/pg/ "$1" --recursive --exclude "*" --include "duneinsolite_*"'
   ```
   (`$1` = archive path, `$2` = its `.sha256`.)
3. Run one backup: `./scripts/db-backup.sh`. Confirm the archive **and** its
   `.sha256` appear at the destination.
4. From a **different** machine, run
   `OFFSITE_FETCH_CMD='...' ./scripts/db-restore-verify.sh` — it must fetch the
   latest archive from the destination, restore into a throwaway DB, pass the
   sanity checks (`tables`, `flyway_schema_history`, `users`, `reservations`),
   and drop it.
5. Break the happy path on purpose once: point `BACKUP_OFFSITE_CMD` at a bad
   bucket, run a backup, confirm it logs `OFF-SITE COPY FAILED` and the wrapper
   exits non-zero (so the monitoring alert in `observability.md` fires).
6. Wire the failure from step 5 to a real alert channel and confirm it arrives.

## Evidence required to close the blocker

- [ ] destination + credential provisioned; credential is **not** in git (`npm run scan:secrets` still clean)
- [ ] one archive + `.sha256` confirmed present off-host, on a host the DB host cannot delete
- [ ] `db-restore-verify.sh` with `OFFSITE_FETCH_CMD` passed **from a second machine** — paste the PASS line + date
- [ ] induced off-site failure produced a non-zero exit **and** a delivered alert
- [ ] retention configured to match F-5.2 (or the documented interim)
- [ ] `backup-restore.md` "Go-live checklist" item ticked with the evidence date
