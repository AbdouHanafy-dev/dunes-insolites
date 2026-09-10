# Phase 5 — baseline (state at start of the production-hardening pass)

**Date:** 3 September 2026. Records what was already true, so the delta this
phase adds is measurable. "Phase 5" here is the operational-readiness /
release-gate pass; it builds on the six prior phases.

---

## 1. Verification suite — baseline counts

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:web` (frontend + admin vitest) | PASS — frontend 36, admin 13 |
| `npm run backend:test:unit` (surefire) | PASS — **56** |
| `npm run validate:prod-config` | PASS — 26/26 |
| `npm run backend:test:it` (failsafe, Testcontainers) | **62** — green in isolation; the local Docker Desktop was unstable this session and flaked several RabbitMQ containers mid-run (env, not code) |
| `npm run build --workspace frontend` (no API url, `DEPLOY_ENV=production`) | correctly **fails closed** (DI-031) |
| Flyway V1–V5 | valid, `ddl-auto: validate` |

## 2. What the prior phases already delivered (not re-done here)

- **Phase 1** — accommodation pricing: server-authoritative, per-unit/night, snapshot-based, fail-closed.
- **Phase 2** — availability: PostgreSQL row locking, expiring holds, concurrency test (8/8 repeated, exactly-one-winner).
- **Phase 3** — money: full `Double → BigDecimal` migration, single `Money` policy, `NUMERIC` columns via Flyway, reservation→invoice integration test, V5 data-preservation test.
- **Phase 4** — per-user IDOR: `getReservationById`, cancel, `updateReservation`, `getInvoiceById`/by-reservation, `recordPayment` all scoped at the service layer via `CallerContext`; `generateFactureLater` fails closed on `ROUTE_INSOLITE`; `ReservationOwnershipIdorIT` (7).
- **Phase 5 (privacy)** — data export (`/api/users/me/export`), PII log masking (`LogSanitizer`), consent-timestamp hardening, error-leak hygiene; `UserDataExportIT`, `KeycloakUserSyncServiceConsentTest`, `GlobalExceptionHandlerLeakageTest`, `LogSanitizerTest`.
- **Phase 6** — SEO/nginx: `verify:seo` (green vs real production WordPress), `nginx-coexistence-test`, rollback + verification runbooks, 24 offline SEO tests.
- **Infra already built:** `scripts/db-backup.sh` (with a pluggable `OFFSITE_CMD` hook + sha256), `scripts/db-restore-verify.sh` (restores into a throwaway DB, PASS/FAIL), `docker-compose.backup.yml` sidecar, multi-stage non-root `Dockerfile` with a HEALTHCHECK, `docker-compose.staging.yml`, a Keycloak realm export, CI with 2 gates.

## 3. Known deferred debt at baseline (business/legal-blocked)

| Item | Status |
|---|---|
| Company isolation for operational entities | designed (`docs/adr/0002-company-scoping.md`), not implemented — blocked on OPEN-QUESTIONS Q1/Q2/Q4/Q9 |
| Shared `DocumentSequence` across two legal entities | ARCHITECTURE §13 Critical #1 — needs the accountant (Q4) |
| `toggleCompanyType` has no status check | ARCHITECTURE §13 Critical #2 — same Q4 |
| GDPR legal sign-off | F-5.1–F-5.7 unanswered (retention, controller, DPAs, marketing consent, cookies) |
| Payment provider | none — `Reservation.paymentLink` is a string an admin pastes (Q3) |
| `ReservationServiceImpl` ~1,960 lines | deliberately not refactored (tests-first) |

## 4. Findings this pass surfaced (before fixing)

| # | Finding | Severity |
|---|---|---|
| B-1 | `NotificationConsumer` caught every exception and NACK'd itself → the yml retry advice never fired → a transient failure went straight to the DLQ with **zero retries**; partial-batch persistence on replay could duplicate rows | P1 (reliability) |
| B-2 | `Dockerfile` HEALTHCHECK hardcoded `http://79.143.185.33:8080/...` — container reports unhealthy on any host but the one with that IP routable from inside | P1 (deploy) |
| B-3 | `application.yml` datasource/keycloak/rabbit/frontend **defaults point at `79.143.185.33`** — an unset env var silently connects to a production-shaped remote host instead of failing closed | P1 (config) |
| B-4 | 6 seed scripts hardcoded `testadmin@dunes.local` / `AdminPass1!` (the 7th read it from env) | P2 (hygiene) |
| B-5 | No single deterministic release gate; no committed-secret scanner in CI | P2 (process) |
| B-6 | No off-host backup destination configured (`OFFSITE_CMD` unset); no disaster-recovery / deployment / incident-response runbooks | P1 (operational — infra access) |
| B-7 | `NotificationMessage` has no idempotency key → a broker redelivery of an already-committed message still duplicates rows | P2 (reliability) |
| B-8 | No `mvn` OWASP dependency-check in CI (npm audit is clean; Maven deps are current — SB 4.0.3, KC 26, TC 2.0.3) | P3 |

## 5. What Phase 5 changes

See `docs/reports/phase5-progress.md` for the running log and
`docs/reports/phase5-final-audit.md` for the scored result.
