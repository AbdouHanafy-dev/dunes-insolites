# Phase 5 — progress log

Running log of the operational-readiness / release-gate pass. Baseline:
`phase5-baseline.md`. Scored result: `phase5-final-audit.md`.

---

## STEP 1–2 — baseline + audit

**Found:** B-1..B-8 in `phase5-baseline.md` §4. TODO/FIXME grep: 7 hits, all
documented business-blocked. `npm audit`: 0 vulnerabilities. Maven deps current
(Spring Boot 4.0.3, Keycloak 26, Testcontainers 2.0.3, openhtmltopdf 1.0.10).

## STEP 6 — RabbitMQ reliability (B-1)

**Found:** `NotificationConsumer` used the default manual-ack factory and caught
every exception internally → the `spring.rabbitmq.listener.simple.retry` advice
never fired → a transient failure (DB blip, SSE error) went straight to the DLQ
with **zero retries**; a partial batch (3 of 5 recipients saved, then throw)
re-persisted all 5 on replay.

**Changed:**
- `RabbitMQConfig` — new `notificationListenerContainerFactory` (AUTO ack + a
  retry interceptor with backoff + `RejectAndDontRequeueRecoverer` → DLQ),
  identical in shape to the proven email one.
- `NotificationConsumer` — uses that factory; DB writes wrapped in one
  `TransactionTemplate.execute` (all-or-nothing, clean retry); SSE push moved
  after commit and never fails the message. Email in logs stays masked.
- `DeadLetterConsumer` and `ReservationEmailConsumer` audited — both already
  correct (record-then-ack / retry-then-DLQ). No change.

**Tests added:** `NotificationReliabilityIT` (real Postgres + RabbitMQ, 3):
success → 1 row no DLQ · DB failure → retried > 1× then exactly one DLQ record,
zero half-writes · SSE failure → row saved, no DLQ.

**Remaining (P2, tracked):** B-7 — no idempotency key on `NotificationMessage`,
so a broker redelivery of an already-committed message still duplicates rows.
Design: publisher sets a UUID `dedupeKey`; `Notification` gets a nullable
`dedupe_key` column (Flyway V6) + unique `(user_id, dedupe_key)`; consumer skips
on conflict. Not done this pass (5 files + migration; duplicate bell entries are
cosmetic, not money/booking/data-loss).

## STEP 2/4 — secrets

**Found:** B-4 — `testadmin@dunes.local` / `AdminPass1!` hardcoded in 6 seed
scripts (the 7th, `seed-accommodations.mjs`, already used env vars).

**Changed:** all 6 now read `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` with the
same local fallback. `scripts/scan-secrets.mjs` added — scans every git-tracked
text file for credential literals (AWS/GCP/Slack/GitHub/Stripe keys, private-key
blocks, JWTs, `password:`-style literals), masks findings, exits non-zero. Wired
into CI Gate 1 (`npm run scan:secrets`) and `release:check`. **Current scan: clean
(723 files).**

**Not done (needs the credential owner):** the Gmail app-password rotation and
the `79.143.185.33` host secret verification remain open — `DI-002-secret-rotation-checklist.md`
tracks them. `secret-rotation.md` runbook added.

## STEP 3 — production config fail-closed (B-2, B-3)

**Found:** B-3 — `application.yml` datasource/keycloak/rabbit/frontend defaults
point at `79.143.185.33`; an unset env var silently connects to that remote
host. B-2 — `Dockerfile` HEALTHCHECK hardcoded that same IP.

**Changed:**
- `ProductionConfigGuard` (`InitializingBean`) — when `DEPLOY_ENV=production` or
  a `*prod*` profile is active, refuses to finish context startup unless every
  critical secret/endpoint is explicitly set and no critical URL contains
  `79.143.185.33`, and `ddl-auto` is validate/none. Aborts the boot with an
  exact problem list. No-ops outside production.
- `Dockerfile` HEALTHCHECK → `http://localhost:8080/...` (matches compose).

**Tests added:** `ProductionConfigGuardTest` (8, pure logic, injected env
lookup): no-op outside prod · complete prod passes · each missing secret fails
closed · multiple problems all reported · leaked-host fails closed · `ddl-auto:
update` fails closed · mail password conditional on mail health · `prod` profile
counts.

## STEP 7/12 — backup / restore / DR

**Found:** B-6 — off-host backup mechanism exists (`OFFSITE_CMD` hook) but no
destination configured; no restore-from-off-host path; no DR/deployment/incident
runbooks.

**Changed:** `db-restore-verify.sh` — added `OFFSITE_FETCH_CMD` (pull the latest
archive back from off-host before verifying — the real "can we recover after
losing this host" drill) and sha256 integrity check before restore. Runbooks
`deployment.md` and `incident-response.md` added; `disaster-recovery` scenarios
folded into the latter + `backup-restore.md` (which already has RPO ≤24h / RTO
<1h). **`OFFSITE_CMD` on the host is still an infrastructure-access task.**

## STEP 14/31 — release gate

**Added:** `npm run release:check` (`scripts/release-check.mjs`) — one command
that runs static invariants (ddl-auto, Flyway version sequence, seed-fallback
literal), secret scan, prod-config validation, typecheck, lint, web tests,
backend unit tests, the fail-closed build check, backup freshness, and
(with `--it`) integration tests. Prints **PASS / FAIL / BLOCKED** with reasons.
Current local run: **BLOCKED** (only on `backup freshness` — no local backups
dir — and `--it` not passed; every code gate PASS).

## STEP 24 — CI

Gate 1 now runs `npm run scan:secrets` first. (`seo-live-canary` optional job
added in Phase 6.)

## STEP 23 — dependencies

`npm audit`: **0 vulnerabilities**. Maven: no OWASP dependency-check plugin
configured (needs an NVD API key + is slow) — tracked as P3; deps are all
current majors.

## Not attempted this pass (scope — multi-session program)

Full company-isolation implementation (Q1/Q2/Q4-blocked), a comprehensive
`ReservationServiceImpl` test suite, property/invariant test expansion beyond
what Phases 1–3 added, a provisioned Prometheus/Grafana stack, the Maven OWASP
scan, the notification idempotency key, a real production deployment/rollback
rehearsal (no host access from here). See `phase5-final-audit.md` for the
severity-classified remainder.
