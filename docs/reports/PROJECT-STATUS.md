# Dunes Insolites — production-hardening programme: status & ratings

**Last updated:** 3 September 2026
**What this is:** one document summarising every hardening phase, what it found,
what changed, the evidence, and an honest rating of the whole project.

Per-phase detail lives in `docs/reports/phase{1..6}-*.md` and
`docs/reports/phase5-*.md`. This is the map.

---

## 0. The project in one paragraph

A booking platform for a Tunisian desert camp. **Next.js public site** +
**Next.js admin (BFF)** + **Spring Boot 4 API** + Postgres / Keycloak /
RabbitMQ. The product is the *nuitée* (a night at the Sabria camp, with
optional activities). Two legal entities will eventually share the platform
(Dunes Insolites + Route Insolite); only **Dunes launches first**, targeted
15 September 2026. Largely one developer. ~11k lines of backend Java, ~23k lines
of frontend/admin TypeScript, 106 commits.

The hardening programme took the codebase from "well-tested dev project"
(≈7.5/10 engineering, ≈5/10 launch-ready) toward "defensible production system".

---

## 1. Phase 1 — Accommodation pricing

**Report:** `phase1-accommodation-pricing.md`

**Problem found:** the price a guest paid for a camp stay was derived
client-side / from the catalogue at read time, per-person, with no record of
what was actually agreed. A catalogue price change moved historical bookings.

**What changed:**
- The nuitée is priced **per accommodation unit, per night**, server-side only.
- `AccommodationType` (Desert Tent / Desert Room / Dune Suite) belongs to a
  nuitée; `capacity` = guests per unit; `maxUnits` = physical inventory
  (nullable = "unknown, no ceiling").
- Every booking **snapshots** the tier id/name/units/price/TVA onto
  `ReservationTourType` — immutable thereafter.
- Missing production prices **fail closed** (the tier is not bookable, not
  "free").
- Admin edits preserve the snapshot; legacy per-person `TourType` pricing still
  works for non-accommodation lines.

**Evidence:** `AccommodationPricingServiceTest` (7), `AccommodationBookingIT`
(12, real Postgres) — guest charged the authoritative tier price, party size
doesn't inflate it, unpriced/undersized tiers rejected with no side effect, a
later catalogue change never moves an existing booking.

**Remaining:** real production prices + the `maxUnits` values are a **business
input** (not invented).

**Rating: 9/10** — clean domain model, fail-closed, fully tested.

---

## 2. Phase 2 — Availability, holds & concurrency

**Report:** `phase2-availability.md`

**Problem found:** availability was partly faked; nothing stopped two guests
booking the same last unit; a public "hold" consumed inventory forever.

**What changed:**
- Availability is computed from real reservations in PostgreSQL.
- **Expiring holds:** a public PENDING reservation reserves inventory only until
  `holdExpiresAt`; `HoldExpiryJob` (`@Scheduled`, injectable `Clock`) moves it
  to `EXPIRED`.
- **Concurrency safety:** `AccommodationTypeRepository.lockById`
  (`PESSIMISTIC_WRITE`) is held to transaction commit; `sumConsumingUnits`
  counts CONFIRMED/CHECKED_IN + PENDING-with-unexpired-hold; check→persist
  happen inside the same lock. Confirmation re-checks inventory (a hold may
  have expired and been taken).
- Date intervals: check-in inclusive, check-out exclusive.

**Evidence:** `AccommodationAvailabilityServiceTest` (7), `AccommodationAvailabilityIT`
(13), **`AccommodationConcurrencyIT`** (8) — `@RepeatedTest` with real
simultaneous requests against real Postgres: **exactly one winner, every time**.
"If the test ever produced two successful bookings, Phase 2 would be failed."

**Remaining:** the *sitewide* `ReservationCapacityValidator` (for non-accommodation
capacity) is still TOCTOU-prone — documented, not on the launch product's path.

**Rating: 9/10** — the hard part (provable exactly-one-winner) is done.

---

## 3. Phase 3 — Money: `Double` → `BigDecimal`

**Report:** `phase3-money.md`

**Problem found:** every monetary value — invoice totals, TVA, timbre fiscal,
catalogue prices — was stored and computed as `Double`. Binary floating point
cannot represent decimal currency, and these are legally binding TVA documents.

**What changed:**
- A repo-wide audit + migration matrix, then: **every monetary/rate field →
  `java.math.BigDecimal`**, every DB column → `NUMERIC` via **Flyway V5**
  (`double precision → numeric(15,3)` with explicit `USING` casts; rates →
  `numeric(6,3)`).
- **One policy class, `Money.java`** — scale 3 (the millime), `HALF_UP`, all
  arithmetic and rounding go through it. The accountant's future ruling (F-4)
  changes that one class and nothing else.
- Comparisons use `compareTo`, never `equals` (scale-sensitive).
- `null` price stays `null` (not silently `0`) — NULL means "not configured".
- Historical data preserved exactly (rounded to scale 3); no invoice
  recalculated with today's tax policy.
- Frontend shows a display-only estimate; the authoritative total is never
  submitted.

**Evidence:** `MoneyTest` (8 — rounding boundaries `0.0005`→`0.001`,
`99.9995`→`100.000`, NULL/zero semantics), `ReservationInvoiceIT` (2, real
Postgres) — HT + TVA reconciles to TTC to the millime; a catalogue change to
`999` leaves an issued invoice at `165`. `FlywayMigrationsIT` V5 test — a legacy
`double` `4.9` reads back `4.900` at scale 3.

**Remaining:** shared `DocumentSequence` across two entities (Q4, accountant).

**Rating: 9.5/10** — textbook migration, isolated policy, fully tested.

---

## 4. Phase 4 — Per-user access control (IDOR)

**Report:** consolidated in `phase5-final-audit.md` §1; ADR `docs/adr/0002-company-scoping.md`

**Problems found (real, exploitable):**
- `GET /api/reservations/{id}` was `isAuthenticated()` only → **any logged-in
  user could read any reservation** (guest name, email, phone, dates, price).
- `PATCH /api/reservations/{id}/status` → **any client could cancel anyone's
  booking**.
- `GET /api/invoices/{id}` → **any user could read any invoice** (financial doc
  + matricule fiscal + address).
- `POST /api/reservations/{id}/payments` — the controller comment claimed an
  ownership check "in PaymentServiceImpl"; **it did not exist** → any client
  could pay against, and read the payment summary of, any reservation.

**What changed:**
- **`CallerContext`** — one server-side seam: `requireUserId()` (from the JWT
  subject), `isStaff()`, `requireStaffOrOwner(ownerUserId)` → 403 otherwise
  (fails closed on a null owner too).
- Ownership enforced **at the service layer** (not just controller annotations)
  for: reservation read / status / update, invoice read + by-reservation,
  `recordPayment`.
- `generateFactureLater` **fails closed**: absent company → `DUNES_INSOLITES`;
  explicit `ROUTE_INSOLITE` → 403 until the model exists.
- Convention: unauthorised cross-owner access → **403**.

**Company-level isolation:** designed in **ADR-0002** (ownership matrix,
Keycloak-group → JWT-claim strategy, repository enforcement, migration plan) but
**not implemented** — it depends on business decisions Q1/Q2/Q4/Q9 and
`CLAUDE.md` forbids guessing them. Only one company operates today, so this is a
hard **R4 gate**, not a launch blocker.

**Evidence:** `ReservationOwnershipIdorIT` (7, real Postgres) — owner allowed,
stranger 403, staff allowed, `generateFactureLater` company guard.

**Rating: 8/10** — per-user boundary closed and tested; company boundary is a
documented, business-blocked design.

---

## 5. Phase 5a — GDPR / privacy technical controls

**Reports:** `docs/privacy/data-inventory.md`, `docs/privacy/legal-decisions-required.md`, `docs/runbooks/privacy-and-data-rights.md`

**What changed:**
- **Data export:** `GET /api/users/me/export` → a JSON document with the
  caller's profile, reservations, invoices, transactions, notifications,
  reviews, newsletter status. Scoped to the JWT subject only; **no passwords,
  tokens, secrets, or other users' data**.
- **PII-safe logging:** `LogSanitizer.maskEmail` / `maskPhone` applied to every
  routine log across 7 services (`jane.doe@x.com` → `j***e@x.com`);
  `DeadLetterConsumer` no longer logs raw message payloads.
- **Consent hardening:** `termsAcceptedAt` is set server-side at registration,
  never from a client field; a CLIENT registration without acceptance is
  rejected before any write; no update DTO can rewrite it.
- **Error hygiene:** verified — every unhandled exception → generic 500, no
  stack trace / SQL / PII in the response.
- **Full PII inventory** + a **legal decision register** (F-5.1–F-5.7).

**Evidence:** `UserDataExportIT` (4), `KeycloakUserSyncServiceConsentTest` (5),
`GlobalExceptionHandlerLeakageTest` (2), `LogSanitizerTest` (3).

**Remaining — cannot be fixed by engineering:** legal GDPR sign-off is
**impossible** without F-5 (controller structure, retention periods,
erasure-vs-accounting, DPAs, marketing consent, cookies). No erasure /
anonymisation mechanism (blocked on F-5.3).

**Rating: engineering 8/10 · legal readiness 5/10** (blocked, correctly isolated).

---

## 6. Phase 6 — SEO / nginx migration verification

**Reports:** `phase6-nginx-seo.md`, `phase6-url-inventory.md`, `docs/runbooks/nginx-seo-rollback.md`, `docs/runbooks/seo-migration-verification.md`

**Context:** the Next.js site is replacing a WordPress site with **53 indexed,
French-ranking URLs**. This phase verified the strangler migration is safe and
reversible — it did **not** perform the migration (that's Phase 7).

**What was found:**
- **Production is behind Cloudflare** — every repo doc said "nginx is the sole
  ingress". Now documented.
- The nginx split config's allowlist was **missing `/faq/`, `/guides/*`, and
  every locale-prefixed route** (`/en/…`, `/de/…`, …) — they'd have fallen
  through to a WordPress 404. Fixed (additive; no ranked URL affected — the
  baseline crawl is 100% unprefixed French).
- `http://dunes-insolites.com/` is a pre-existing 2-hop redirect (Cloudflare).
- Two ranked URLs (`/presentation-…`, `/dunes-insolites-camp-gallery`) serve 200
  but canonical to `/about/` / `/gallery/` — a cross-URL canonical; flagged as a
  **decision** (consolidate vs preserve), not changed.

**What was built:**
- **`npm run verify:seo`** (`scripts/verify-production-urls.mjs`) — a URL
  response-contract checker (status, redirect loops/chains, canonical, hreflang,
  robots, sitemap). **Ran green against real production WordPress: 60/60.**
- **`npm run verify:seo:coexistence`** — runs the real nginx config in Docker
  and proves WordPress URLs → WordPress, new URLs → Next.js, and a new route
  cannot steal a ranked URL. **16/16.**
- 24 offline SEO regression tests in CI (`frontend/lib/seo-contract.test.ts`).
- `docs/seo/redirect-map.csv`, `docs/seo/url-contract.json`.
- Rollback + verification runbooks.

**Remaining (Phase 7 launch blockers, need infra access):** fill the 3 nginx
TODOs + confirm the live config; audit Cloudflare; drill rollback on a real
origin; verify the nextjs profile against a staging deploy.

**Rating: 7/10** — verification is thorough and partly real-host-proven; the
"prove it on the actual server" half is blocked on access.

---

## 7. Phase 5b — Operational readiness / release gate

**Reports:** `phase5-baseline.md`, `phase5-progress.md`, `phase5-final-audit.md`

**What was found & fixed:**
- **`NotificationConsumer` reliability bug (P1):** it caught every exception and
  NACK'd itself → the retry advice never fired → a transient failure went
  **straight to the DLQ with zero retries**; a partial batch re-persisted on
  replay. Fixed with a retry-then-DLQ factory + a transactional all-or-nothing
  write. `NotificationReliabilityIT` (3, real infra).
- **`Dockerfile` HEALTHCHECK** hardcoded the production IP → container unhealthy
  on any other host. Fixed.
- **`ProductionConfigGuard`** — the backend now **refuses to start** when
  `DEPLOY_ENV=production` unless every critical secret/endpoint is explicitly set
  and no URL points at the leaked `79.143.185.33` host. `ProductionConfigGuardTest` (8).
- **`npm run scan:secrets`** — scans every git-tracked file for credential
  literals; in CI Gate 1; clean (723 files). Fixed 6 seed scripts that
  hardcoded a dev admin password.
- **`npm run release:check`** — one command: static invariants + secret scan +
  prod-config + typecheck/lint/tests + fail-closed build + backup freshness →
  **PASS / FAIL / BLOCKED**.
- **`db-restore-verify.sh`** — added `OFFSITE_FETCH_CMD` (pull from off-host
  before verifying) + sha256 integrity check.
- Runbooks added: **deployment** (11 steps), **incident-response** (11
  scenarios), **secret-rotation**.

**Remaining:** off-host backup destination unset; monitoring stack not deployed;
no real deployment/rollback rehearsal; notification idempotency key; formal
reservation state machine. All classified in `phase5-final-audit.md`.

**Rating: engineering 8/10 · operational 6/10.**

---

## 8. Consolidated test evidence

| Suite | Count | Infra |
|---|---|---|
| Backend unit | **64** | — |
| Backend integration | **65** | real Postgres + RabbitMQ (Testcontainers) |
| Frontend + admin | **49** | vitest |
| Production-config validation | 26/26 | static |
| SEO contract (offline) | 24 | in `test:web` |
| `verify:seo` vs real production | 60/60 | live WordPress |
| `verify:seo:coexistence` | 16/16 | real nginx in Docker |
| Secret scan | clean, 723 files | CI Gate 1 |
| `npm run verify` | PASS | — |

Integration coverage by area: accommodation pricing 12 · availability 13 ·
concurrency 8 · reservation→invoice 2 · money 8 + Flyway 3 · IDOR 7 · privacy
export 4 + consent 5 · email reliability 7 · notification reliability 3 ·
observability 6.

---

## 9. Overall ratings

> Updated 3 Sep 2026 after the engineering-quality hardening pass
> (`docs/reports/phase-engineering-hardening.md`): reservation state machine +
> notification idempotency (V6) + public-booking idempotency (V7) + sitewide-
> capacity TOCTOU fix + authenticated-create mass-assignment fix. 94 unit +
> ~72 integration tests.

> Updated 4 Sep 2026 after the final-hardening pass
> (`docs/reports/final-hardening-report.md`): `ReservationInvoiceService`
> extracted from `ReservationServiceImpl` (1,938 → 1,660 L, ADR-0004) behind a
> characterization net; a real `ReservationExtra` IDOR (CLIENT could add/read
> extras on any reservation) found and fixed with a regression test;
> `generateFactureLater` non-determinism fixed; full authorization matrix
> (`docs/security/authorization-matrix.md`). Engineering ~8.6 → **~8.9**;
> production readiness ~6.3 → **~6.5**, then the production-readiness pass
> (4 Sep 2026, `final-hardening-report.md` addendum): monitoring stack built +
> proven (Prometheus/Alertmanager/Grafana, 11 alerts, private
> `MANAGEMENT_SERVER_PORT`); off-host backup round-trip proven against MinIO +
> a real `db-backup.sh` checksum bug fixed → **~7.2** (still NOT READY).
> The production host `79.143.185.33` is identified as the owner's Contabo VPS,
> turning the infra blockers into executable work on that host.

### Engineering quality — **~8.9 / 10**

| Dimension | Score | Note |
|---|---|---|
| Architecture | 8.5 | Clean layering, real ADRs, explicit `ReservationStateMachine`, 290-line method broken up. Minus: `ReservationServiceImpl` still ~1,760 lines / owns invoice generation; company model deferred. |
| Security | 8.5 | Role-escalation + per-user IDOR + authenticated-create mass-assignment closed & tested; BFF solid; fail-closed config; secret scan. Minus: no company-scoped staff (business-blocked). |
| Financial correctness | 9.5 | Textbook BigDecimal migration, single policy, snapshot immutability tested; untouched and re-audited. Minus: shared `DocumentSequence` (dormant, Q4). |
| Reliability | 9 | Both message consumers retry-then-DLQ **and durably idempotent** (V6); public booking idempotent (V7); sitewide-capacity TOCTOU closed — all proven with concurrent + replay ITs. |
| Testing | 8.5 | 94 unit + ~72 integration; +48 this pass on the exact weak spots (state transitions 7×7, idempotency, concurrency, mass assignment). Minus: `ReservationServiceImpl` create/pricing paths still under-covered. |
| Data integrity | 9 | Flyway deterministic, `validate`-only, restore proven; two additive partial unique indexes enforce the new invariants at the DB level; V5 data-preservation still tested. |
| Documentation | 9 | Runbooks for everything; ADR-0003; comments explain *why* and record bugs caught by running. |
| Maintainability | 7.5 | Strong conventions, strict TS, the big method is gone. Minus: 4 frontend stacks / 1 dev; the big service. |

**The gap to 9.5 is one code item + blocked items:** extract
`ReservationInvoiceService` from `ReservationServiceImpl` (needs a
characterization-test net first — it is the money path); broader
`createReservation` coverage; company isolation (Q1/Q2/Q4) and the
`DocumentSequence` remedy (accountant) are business/legal, not code.

### Production readiness — **~6.3 / 10 — NOT READY**

| Dimension | Score | Note |
|---|---|---|
| Deployment | 7 | Reproducible runbook + fail-closed guard + `release:check`. Not executed by a second person. |
| Infrastructure | 5 | Cloudflare + nginx topology documented; live nginx config unconfirmed; 3 TODOs. |
| Backup / restore | 7 | Scripts solid, restore proven, sha256 + off-host-fetch. Minus: **off-host destination unset**. |
| Monitoring | 5 | Metrics + correlation IDs + alert list exist. Minus: **no Prometheus/Grafana deployed**. |
| Security (ops) | 7 | Fail-closed config, secret scan, non-root container, host-only ports. Minus: Gmail password not rotated. |
| Incident response | 8 | 11-scenario runbook, executable. Not game-day tested. |
| Rollback | 6 | Mechanism sound + container-tested; **never drilled on a real origin**. |
| SEO migration | 7 | Baseline verified live and green. Minus: nextjs profile + real drill need staging. |
| GDPR readiness | 5 | Technical controls in; **legal sign-off impossible without F-5**. |

---

## 10. What stands between here and launch

### Blockers (infrastructure access)
- [ ] Configure an **off-host backup destination** (`OFFSITE_CMD`), verify with `OFFSITE_FETCH_CMD ./scripts/db-restore-verify.sh`
- [ ] Fill the 3 nginx TODOs (upstreams, TLS), confirm the repo config is the live one
- [ ] Audit + document the Cloudflare layer
- [ ] Set `DEPLOY_ENV=production` + every `ProductionConfigGuard`-required var in `.env` on the host
- [ ] Stand up a monitoring stack (metrics scrape + the alert list in `observability.md`)
- [ ] Execute one real deployment + rollback rehearsal (staging origin)

### Blockers (credential owner)
- [ ] Rotate the Gmail app password; verify the `79.143.185.33` host secret status

### Blockers (legal — cannot ship EU PII without these)
- [ ] F-5.1 controller structure · F-5.2 retention periods · F-5.3 erasure vs accounting retention
- [ ] F-5.4 processor/sub-processor DPAs · F-5.5 marketing consent · F-5.6 cookies/analytics
- [ ] Publish a privacy policy naming the correct controller(s)

### Business decisions (block R2/R4, not necessarily launch)
- Q1 mixed-trip invoicing · Q2 reservation granularity · Q3 payment provider ·
  Q4 shared invoice-sequence remedy (accountant) · F-3 hold window · F-4 rounding/VAT convention

### P2 engineering (not blockers, tracked)
- Notification idempotency key (V6 migration) · formal reservation state-machine test matrix ·
  public-booking client idempotency key · sitewide-capacity TOCTOU · `ReservationServiceImpl` test coverage ·
  `toggleCompanyType` status check · Maven OWASP scan in CI

---

## 11. Verdict

**The code is better than most funded teams ship** — the money path, the
booking-concurrency path, the auth boundary and the message pipeline are
hardened and proven against real infrastructure, and the team documents what is
broken instead of hiding it.

**It is not launch-ready**, and the gap is almost entirely **operational and
legal, outside this repository**: off-host backups, a confirmed production
configuration, live alerting, a real rollback rehearsal, and GDPR legal
sign-off. None of these is large; all are concrete; none can be completed from a
development machine with no host access.

A skeptical engineer inspecting the repo today would **not** find a credible
code path to silent money corruption, lost bookings, overbooking of the launch
product, lost critical messages, or cross-*user* data leakage. They **would**
correctly flag that it has never been deployed and rolled back for real, that
backups live on one host, that there is no live alerting, and that it cannot
legally hold European personal data until the F-5 decisions are made.
