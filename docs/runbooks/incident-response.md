# Runbook — incident response

One page per scenario: **detect → contain → diagnose → recover → verify →
escalate → post-incident**. Keep this short and executable.

**First 60 seconds, every incident:**
1. Note the time (UTC) and what you observed.
2. `curl -fsS http://127.0.0.1:8080/actuator/health` and `.../health/readiness` on the host.
3. `docker compose -f backend/docker-compose.yml ps` — what's up / restarting?
4. Grab the correlation id from the failing request if you have one (`X-Correlation-Id` header / the `[...]` in logs).

Alerts to wire (see `docs/runbooks/observability.md` for metric names): app
down, readiness failing, DB down, RabbitMQ down, `email_dead_letter_total > 0`,
5xx spike, backup age > 26h, cert expiry < 14d.

---

## Site down / 5xx spike

- **Detect:** external check fails; `5xx` rate on `/actuator/prometheus`.
- **Contain:** if a bad deploy — roll back (`deployment.md` §10). If load — Cloudflare "Under Attack" mode.
- **Diagnose:** `docker compose logs --since 15m backend`; check readiness (DB/RabbitMQ gate it); `ProductionConfigGuard` message on last boot?
- **Recover:** restart the unhealthy container; if it won't start, roll back the image.
- **Verify:** readiness UP; `verify:seo` (wordpress) 0 failed; a real booking succeeds.

## Database unavailable

- **Detect:** readiness DOWN with a `db` component; `Connection refused` / pool exhaustion in logs.
- **Contain:** the app already fails readiness → nginx/Cloudflare can show a maintenance page; do **not** restart-loop the app.
- **Diagnose:** `docker compose ps postgres`; `docker compose logs postgres`; disk full? (`df -h`); connection count (`SELECT count(*) FROM pg_stat_activity;`).
- **Recover:** restart Postgres; if the volume is corrupt → **restore** (`db-restore.sh <archive> duneinsolite` with typed confirmation, or DR runbook). Accept the RPO window (≤24h with daily backups).
- **Verify:** `db-restore-verify.sh` style checks — table count, `flyway_schema_history`, `users`, `reservations`; app readiness UP.

## RabbitMQ unavailable

- **Detect:** readiness DOWN (`rabbit` component); `ShutdownSignalException` in logs; publishers failing.
- **Impact:** bookings still persist (HTTP path). Notifications + confirmation emails **queue up or fail** — they are NOT lost if the broker comes back (durable queues) but new publishes during the outage may be dropped by the publisher's fail-open.
- **Recover:** restart RabbitMQ; queues + DLQ are durable. After recovery, check `notification.dlq` depth and replay if needed (below).
- **Post:** for any booking made during the outage, manually verify its confirmation email/notification went out.

## Email outage (SMTP failing)

- **Detect:** `email_dead_letter_total` climbing; ERROR "email FAILED ... DLQ" in logs.
- **Contain:** nothing customer-facing breaks; bookings succeed. But confirmations aren't arriving.
- **Diagnose:** SMTP creds valid? (Gmail app password rotated but not updated on the host is the classic cause — `DI-002`). `management.health.mail` status.
- **Recover:** fix creds → restart backend → **replay the DLQ**: `GET /api/admin/ops/dead-letters` (ADMIN) to list, `POST /api/admin/ops/dead-letters/{id}/replay` per stuck message. Replay is idempotent (`email_dispatch` dedup) — a message already sent won't re-send.
- **Verify:** DLQ back to 0; test email arrives.

## Duplicate-booking / overbooking suspicion

- **Detect:** a report, or two `reservations` rows for the same unit+dates in a CONFIRMED/CHECKED_IN state.
- **Diagnose:**
  ```sql
  SELECT r.reservation_id, r.status, rtt.accommodation_type_id, rtt.accommodation_units,
         r.check_in_date, r.check_out_date, r.hold_expires_at
  FROM reservations r JOIN reservation_tour_types rtt ON rtt.reservation_id = r.reservation_id
  WHERE rtt.accommodation_type_id = :id AND r.deleted_at IS NULL
    AND r.check_in_date < :checkout AND r.check_out_date > :checkin
  ORDER BY r.created_at;
  ```
  Phase 2's pessimistic lock + `sumConsumingUnits` should make true overbooking impossible for accommodation-priced lines. If you see it: check `AccommodationType.maxUnits` (null = "unknown, no ceiling" — a config gap, not a bug), and whether the sitewide `ReservationCapacityValidator` (known TOCTOU-prone for non-accommodation capacity) was the path.
- **Contain:** manually cancel/rebook the later reservation with the customer; correct `maxUnits` if it was null.
- **Post:** if the accommodation lock path failed, this is a P0 — file it, add a regression test, do not deploy until reproduced.

## Payment discrepancy

- **Detect:** a `transactions` sum that doesn't match what the customer says they paid; a reservation marked PAID with no matching transaction.
- **Diagnose:** the server is authoritative — `SELECT * FROM transactions WHERE reservation_id = :id`; compare to `computePaymentSummary`. Amounts are `BigDecimal`/`NUMERIC` (Phase 3) so rounding is not the cause. `recordPayment` rejects amount > remaining and enforces owner/staff (Phase 4).
- **Contain:** do not adjust amounts in the DB by hand. Record a correcting transaction through the API.
- **Post:** if a client-supplied amount was trusted anywhere, that's a P0 (Phase 4 closed the known paths).

## Secret compromise

- **Detect:** a secret found in a commit / log / paste; anomalous auth.
- **Contain immediately:** rotate the credential at its source (`DI-002-secret-rotation-checklist.md` / `secret-rotation.md`). For Keycloak client secret: regenerate in Keycloak, update `.env`, restart. For DB/RabbitMQ: change the password, update `.env`, restart. For Gmail: revoke the app password.
- **Diagnose scope:** `npm run scan:secrets`; `git log -p -S '<fragment>'`; check access logs for the window.
- **Recover:** confirm the old value is dead (a request using it fails). Purge from history if it was committed (BFG/filter-repo) + force-push + rotate again.
- **Escalate:** if customer data may have been accessed → PII exposure playbook below + legal.

## PII exposure

- **Detect:** PII in a log aggregator / error tracker / screenshot; an IDOR report.
- **Contain:** revoke the exposed access path (rotate, patch the endpoint). Purge the PII from the log sink.
- **Diagnose:** what fields, how many subjects, how long exposed, who could see it. `LogSanitizer` masks emails in routine logs (Phase 5); check for anything unmasked.
- **Escalate:** GDPR breach assessment is **legal, not engineering** — hand to the controller (F-5.1) with the facts. 72h notification clock may apply.
- **Post:** regression test for the exposed path (Phase 4/5 pattern).

## Backup failure / backup too old

- **Detect:** `db-backup.sh` exits non-zero; `release:check` backup-freshness FAIL; sidecar logs "OFF-SITE COPY FAILED".
- **Contain:** run `./scripts/db-backup.sh` manually now; confirm a fresh archive + off-host copy exist.
- **Diagnose:** disk full? off-host credentials expired? `OFFSITE_CMD` wrong?
- **Verify:** `OFFSITE_FETCH_CMD=… ./scripts/db-restore-verify.sh` — proves the off-host copy is restorable.
- **Do not deploy** while backups are stale.

## Corrupted / wrong migration

- **Detect:** app won't start — Flyway "Validate failed" / checksum mismatch; or a migration applied wrong data.
- **Contain:** do not `flyway repair` blindly. Do not edit an applied migration.
- **Recover:** forward-fix with a new `Vn` that corrects the state (preferred), OR restore from the pre-deploy backup (step 2 of `deployment.md`) accepting the RPO window. See `database-migrations.md`.
- **Post:** the migration that caused it gets a Testcontainers test (fresh + existing DB) before any redeploy.

## Cloudflare / nginx outage

- **Detect:** site unreachable but the origin is healthy (`curl` the origin IP directly with a `Host:` header works).
- **Diagnose:** Cloudflare status page; nginx `systemctl status` / `nginx -t`; cert expiry.
- **Recover:** nginx — `nginx -t && systemctl reload`; if a config change broke it, revert the symlink (`nginx-seo-rollback.md`). Cloudflare — check DNS/proxy status, SSL mode, page rules.
- **Verify:** `verify:seo` (wordpress) 0 failed.
