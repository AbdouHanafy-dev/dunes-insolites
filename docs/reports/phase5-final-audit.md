# Phase 5 — final audit

Independent skeptical review after the operational-readiness pass. Consolidates
all six phases. **The score is not the goal — the evidence is.**

Date: 3 September 2026. Reviewer stance: *"Can I find a credible path by which
this system silently loses bookings, corrupts money, leaks customer data,
overbooks, loses critical messages, or becomes unrecoverable after a host
failure?"*

---

## 1. SECURITY — answers

| Question | Answer | Evidence |
|---|---|---|
| Can a guest access another guest's reservation? | **No** | `ReservationServiceImpl.getReservationById` → `caller.requireStaffOrOwner`; `ReservationOwnershipIdorIT` (stranger → 403) |
| Can a guest cancel / edit another's reservation? | **No** | `updateReservationStatus` non-staff branch + `updateReservation` both `requireStaffOrOwner`; IDOR IT |
| Can a guest read another's invoice / transactions? | **No** | `InvoiceServiceImpl.getInvoiceById` / `getInvoicesByReservation` / `getFacturesByReservation` scoped; `TransactionResponse` only via scoped paths; IDOR IT |
| Can a guest pay / probe another's reservation? | **No** | `PaymentServiceImpl.recordPayment` → `requireStaffOrOwner` (the controller comment had claimed a check that didn't exist — Phase 4 added it); IDOR IT |
| Can CAMPING access another company's data? | **N/A today — YES once Route Insolite exists** | No company dimension on operational entities. Single-company launch. `ADR-0002` — hard R4 gate, not a launch blocker. |
| Can a client manipulate price? | **No** | Prices server-computed from snapshots (Phase 1); booking payloads carry no amount; `AccommodationBookingIT` |
| Can a client manipulate payment amount? | **No** | `recordPayment` rejects amount > remaining; server-authoritative; `PaymentSummary` is `BigDecimal` |
| Can a client escalate role? | **No** | `RegisterRequest` has no role field; `AuthController` hardcodes `CLIENT`; `AuthControllerRegisterSecurityTest` (8) |
| Can an admin endpoint be reached anonymously? | **No** | `/api/admin/**` → `hasRole('ADMIN')` in `SecurityConfig`; `@PreAuthorize` on controllers; DLQ admin IT asserts 401 for unauthenticated |
| Are secrets exposed in the repo? | **No** (as of this scan) | `npm run scan:secrets` — clean, 723 files; CI Gate 1. Historical leak (`79.143.185.33` `.env`) tracked in `DI-002` — rotation is the owner's task |
| Is PII leaking into logs? | **Largely no** | `LogSanitizer.maskEmail` across 7 services; `DeadLetterConsumer` no longer logs raw payloads; error responses generic (`GlobalExceptionHandlerLeakageTest`). `KeycloakUserSyncService:442` still logs Keycloak's error `body` on a create failure — low risk, ERROR-level, flagged P2 |

## 2. MONEY — answers

| Question | Answer | Evidence |
|---|---|---|
| Any authoritative `Double`/`float`? | **No** | Phase 3 migration; `grep` clean except `averageRating` (a review score) and statistics display ratios; `phase3-money.md` §7 |
| Any client-controlled amount? | **No** | see Security |
| Can a catalogue change mutate a historical invoice? | **No** | snapshot on `ReservationTourType`; `ReservationInvoiceIT` — change catalogue to 999, invoice stays 165 |
| Are invoice totals exact? | **Yes** | `NUMERIC(15,3)`; `Money` scale-3 HALF_UP; `HT + TVA == TTC` to the millime asserted in `ReservationInvoiceIT` |
| Is rounding centralized? | **Yes** | one `Money` class; F-4 (accountant ruling) changes only that class |
| Shared invoice sequence across two entities | **Open** | `DocumentSequence` unique on `(type, year)` not company — ARCHITECTURE §13 Critical #1, Q4. Dormant: zero real invoices. Not a single-company launch blocker; **is** an R4 blocker. |

## 3. BOOKINGS — answers

| Question | Answer | Evidence |
|---|---|---|
| Can two guests take the last accommodation unit? | **No** (accommodation-priced lines) | Phase 2 pessimistic `lockById` held to commit + `sumConsumingUnits`; `AccommodationConcurrencyIT` — `@RepeatedTest`, exactly one winner |
| Can an expired hold consume inventory? | **No** | `sumConsumingUnits` excludes PENDING-with-expired-hold; `HoldExpiryJob` + injectable `Clock`; `AccommodationAvailabilityIT` |
| Can an invalid reservation transition occur? | **Mostly guarded** | `updateReservationStatus` rejects transitions from COMPLETED/CANCELLED/REJECTED and CHECKED_IN→non-COMPLETED. **No formal state-machine table / test matrix** — flagged P2. |
| Can duplicate booking happen? | **Low risk** | public booking creates one reservation per request; no client-supplied idempotency key on `POST /api/public/bookings` — a double-submit from the same guest could create two PENDING holds (both expire if unpaid). Flagged P2. |
| Sitewide capacity (`ReservationCapacityValidator`) | **TOCTOU-prone, non-blocking for accommodation** | documented; accommodation path (the launch product) uses the row lock. Tracked. |

## 4. RELIABILITY — answers

| Question | Answer | Evidence |
|---|---|---|
| Can email silently disappear? | **No** | `ReservationEmailConsumer` — AUTO ack + retry + DLQ; `email_dispatch` idempotency; `EmailReliabilityIT` (7) |
| Can notifications silently disappear? | **No longer straight to DLQ** | Phase 5 fix — `NotificationConsumer` now retries before DLQ; transactional batch; `NotificationReliabilityIT` (3). A broker **redelivery of a committed message** still duplicates rows (no idempotency key) — P2, designed not built. |
| Can RabbitMQ messages be lost? | **No** | durable queues + DLX; `DeadLetterConsumer` record-then-ack, nack-requeue on persist failure |
| Can DLQ records be replayed? | **Yes, idempotently** | `DeadLetterAdminController` (ADMIN); `EmailReliabilityIT` replay case |
| Are failures observable? | **Metrics exist; alerting is specified, not provisioned** | `email_dispatch_total`, `email_dead_letter_total`, `/actuator/prometheus` (ADMIN); correlation ids HTTP→queue→DLQ; `observability.md` lists alerts. **No Prometheus/Grafana deployed** — P1 (infra). |

## 5. DATABASE — answers

| Question | Answer | Evidence |
|---|---|---|
| Can migrations be safely applied? | **Yes** | Flyway V1–V5, `baseline-on-migrate`, `ddl-auto: validate`; `FlywayMigrationsIT` — fresh + existing DB, re-run no-op, checksum validate, V5 data-preservation |
| Can backups be restored? | **Yes — proven** | `db-restore-verify.sh` run against the real DB (2 Sep): dump→restore→checks→PASS. Now also does sha256 verify + optional `OFFSITE_FETCH_CMD`. |
| Is the backup off-host? | **NO — mechanism ready, destination not set** | `OFFSITE_CMD` hook exists in `db-backup.sh`; unset on the host. **Launch blocker (infra access).** |
| Is RPO/RTO documented? | **Yes** | `backup-restore.md` — RPO ≤24h (daily), RTO <1h. Tighten with WAL archiving if a lost booking-day is unacceptable (business decision). |

## 6. OPERATIONS — answers

| Question | Answer |
|---|---|
| Can another developer deploy it? | **Yes** — `docs/runbooks/deployment.md` (11 steps, preflight → backup → deploy → smoke → booking test → rollback). Not yet executed by a second person. |
| Can another developer roll it back? | **Backend/frontend: yes** (previous image/artifact). **nginx: yes** (symlink swap, `nginx-seo-rollback.md`). **DB: forward-fix or restore** — documented, not trivially reversible, honest about it. Not drilled on a real host. |
| Can an operator diagnose an outage? | **Yes** — `incident-response.md`, 11 scenarios with detect/contain/diagnose/recover/verify. Correlation ids + health components help. |
| Can production config fail closed? | **Yes** — `ProductionConfigGuard` (backend, `DEPLOY_ENV=production`) + DI-031 (frontend build) + `validate-prod-config.mjs` (CI). `ProductionConfigGuardTest` (8). |
| Is there a single release gate? | **Yes** — `npm run release:check` → PASS/FAIL/BLOCKED. |

## 7. SEO — answers

| Question | Answer |
|---|---|
| Are old URLs protected? | **Verified against real production WordPress** — `verify:seo` wordpress profile 60/60; every ranked URL 200 + self-canonical |
| Are redirects tested? | **Offline + coexistence yes; live nextjs profile needs staging** — `verify:seo:coexistence` 16/16, 24 offline tests, `redirect-map.csv` |
| Is rollback tested? | **Locally yes (container), real host no** — `nginx-seo-rollback.md` |

## 8. GDPR — answers

| Question | Answer |
|---|---|
| Are technical controls present? | **Yes** — export (`/api/users/me/export`), PII masking, consent-timestamp integrity, error hygiene. `phase5` privacy tests. |
| Are unresolved legal decisions separated? | **Yes** — `docs/privacy/legal-decisions-required.md` (F-5.1–F-5.7): controller, retention, erasure-vs-accounting, processors/DPAs, marketing consent, cookies, export format. **Legal sign-off is NOT POSSIBLE without these.** |

---

## SCORES (0–10, evidence-based; ≥9 requires evidence, 10 is rare)

### Engineering quality

| Dimension | Score | Why not higher |
|---|---|---|
| Architecture | **8** | Clean layering, real ADRs, honest debt tracking. `ReservationServiceImpl` ~1,960 lines doing 5 jobs; company model deferred. |
| Security | **8** | Role-escalation + per-user IDOR closed and tested; BFF solid; fail-closed config; secret scan. −: no company-scoped staff (business-blocked), one Keycloak-error-body log line, no formal endpoint authz matrix test. |
| Financial correctness | **9** | Textbook BigDecimal migration, single policy, snapshot immutability tested. −: shared `DocumentSequence` (dormant, business-blocked). |
| Reliability | **8** | Email + notification consumers now retry-then-DLQ, all tested against real infra; idempotent replay. −: no notification idempotency key; sitewide-capacity TOCTOU; no formal reservation state machine. |
| Testing | **7.5** | 64 unit + 65 integration, real Postgres/RabbitMQ, concurrency + reliability + IDOR + money + migration. −: `ReservationServiceImpl` still under-covered; no property/invariant suite beyond Phases 1–3; state-transition matrix missing. |
| Data integrity | **8.5** | Flyway deterministic, `validate`-only, restore proven, soft-delete for financial records, FK cascade audit done. −: off-host copy not configured. |
| Documentation | **9** | Runbooks for deploy, rollback, backup, DR (via incident), incident, observability, migrations, email/DLQ, privacy, secrets. Comments explain *why* and record bugs found by running. |
| Maintainability | **7** | Strong conventions, `strict` TS zero-`any`. −: 4 frontend stacks / 1 dev; the big service; `admin` off the shared contract. |

**Engineering quality: ~8.0 / 10** (was ~7.5).

### Production readiness

| Dimension | Score | Why not higher |
|---|---|---|
| Deployment | **7** | Reproducible runbook + fail-closed guard + release:check. −: not executed by a second person; `DEPLOY_ENV` / `.env` still to be set on the host. |
| Infrastructure | **5** | Cloudflare + nginx topology documented; the repo can't confirm the live nginx config; 3 nginx TODOs open. |
| Backup / restore | **7** | Scripts solid, restore proven, sha256 + off-host-fetch added, RPO/RTO set. −: **off-host destination not configured** (blocker). |
| Monitoring | **5** | Metrics + correlation ids + alert list exist. −: **no Prometheus/Grafana deployed**; alerts are a spec, not live. |
| Security (ops) | **7** | Fail-closed config, secret scan, non-root container, host-only ports. −: Gmail password not rotated; Maven OWASP scan not in CI. |
| Incident response | **8** | 11-scenario runbook, executable. −: not exercised in a game-day. |
| Rollback | **6** | Mechanism sound and container-tested; **never drilled on a real origin**; DB rollback honestly hard. |
| SEO migration | **7** | Baseline verified live and green; contract + coexistence tested. −: nextjs profile + real rollback drill need staging. |
| GDPR readiness | **5** | Technical controls in; **legal sign-off impossible without F-5**; no erasure mechanism. |

**Production readiness: ~6.3 / 10** (was ~5).

---

## REMAINING RISK — classified

### BLOCKER (must clear before taking real money + PII)
- **Off-host backup destination** — set `OFFSITE_CMD` on the host, verify with `OFFSITE_FETCH_CMD ./scripts/db-restore-verify.sh`. *(infra access)*
- **Production nginx / `.env` / `DEPLOY_ENV`** — fill the 3 nginx TODOs, confirm the live config, set every `ProductionConfigGuard`-required var. *(infra access)*
- **GDPR: a published privacy policy + retention decision** before EU PII. *(legal)*
- **Rotate the Gmail app password**; verify the `79.143.185.33` host's secret status. *(credential owner)*

### P1
- No monitoring stack deployed (metrics + alert spec exist). *(infra access)*
- Rollback never drilled on a real origin. *(infra access)*
- `verify:seo` nextjs profile + CMS-301 verification need a staging deploy.

### P2
- `NotificationMessage` idempotency key (broker redelivery → duplicate bell rows). *(engineering — designed, ~1 migration + 5 files)*
- Formal reservation state-machine table + transition test matrix. *(engineering)*
- Public booking has no client idempotency key (double-submit → two expiring holds). *(engineering)*
- Sitewide `ReservationCapacityValidator` TOCTOU (accommodation path is safe). *(engineering)*
- `KeycloakUserSyncService:442` logs Keycloak's error body on create failure. *(engineering — 1 line)*
- `ReservationServiceImpl` test coverage. *(engineering)*
- `toggleCompanyType` no status check. *(business — Q4)*

### P3
- Maven OWASP dependency-check not in CI (npm audit clean; Maven deps current). *(engineering — needs NVD key)*
- 4 frontend stacks / 1 developer. *(strategic)*

### BUSINESS DECISION
Q1 mixed-trip invoicing · Q2 reservation granularity · Q3 payment provider ·
F-3 hold window · F-4 rounding/VAT convention · RPO (is daily enough?).

### LEGAL DECISION
F-5.1 controller · F-5.2 retention · F-5.3 erasure vs accounting · F-5.4
processors/DPAs · F-5.5 marketing consent · F-5.6 cookies/analytics · F-5.7
export format.

### INFRASTRUCTURE ACCESS REQUIRED
Off-host backup config · live nginx config + TLS + upstreams · Cloudflare audit ·
monitoring stack · real deployment + rollback rehearsal · staging environment ·
Search Console export · Gmail/Keycloak credential rotation.

---

## VERDICT

**Engineering quality: ~8.0 / 10** — defensible as serious engineering. The
money path, the booking-concurrency path, the auth boundary and the message
pipeline are hardened and proven against real infrastructure. The gaps are
either business-blocked (company isolation) or bounded and tracked.

**Production readiness: ~6.3 / 10 — NOT READY.** The remaining distance is
almost entirely **operational and outside this repository**: off-host backups,
a confirmed production configuration, a monitoring stack, a real rollback
rehearsal, and legal GDPR sign-off. None is large; all are concrete; none can be
completed from a development machine with no host access.

A skeptical engineer inspecting the repo today would **not** find a credible
code path to silent money corruption, lost bookings, overbooking of the launch
product, lost critical messages, or cross-*user* data leakage. They **would**
correctly flag: it has never been deployed and rolled back for real, backups
only exist on one host, there is no live alerting, and it cannot legally hold EU
personal data until F-5 is answered.
