# Final hardening phase — baseline

**Date:** 4 September 2026
**HEAD:** `e84dfa1` (working tree carries a large uncommitted diff — see §5)
**Purpose:** capture the real state before the invoice-extraction / hardening pass,
so every later claim can be measured against a known starting point.

---

## 1. Verification suite — actual results

| Check | Command | Result |
|---|---|---|
| Typecheck (all workspaces) | `npm run typecheck` | **PASS** |
| Lint (frontend + admin) | `npm run lint` | **PASS** |
| Frontend + admin unit tests | `npm run test:web` | **36 passed** (frontend `lib/api.test.ts` 12 + `lib/seo-contract.test.ts` 24) |
| Backend unit tests | `npm run backend:test:unit` (surefire, `*Test`) | **94 passed**, 0 failures, 0 errors, 15 test classes |
| Production config validation | `npm run validate:prod-config` | **29 / 29** |
| Flyway validation | run inside every backend IT | migrations **V1–V8** validate clean |
| `npm run verify` (typecheck + lint + backend unit) | | **PASS** |
| Secret scan | `npm run scan:secrets` | **clean** (last recorded: 723 files) |

### Backend integration tests (`*IT`, failsafe, Testcontainers Postgres + RabbitMQ)

13 IT classes. Not run in a single pass for this baseline — the local Docker
Desktop collapses ~⅔ through a full `mvn verify` (documented in
`phase-engineering-hardening.md`). Each passes in isolation; CI runs them green
on a real Docker host. Class list:

```
AccommodationAvailabilityIT      AccommodationBookingIT
AccommodationConcurrencyIT       EmailReliabilityIT
FlywayMigrationsIT               GalleryIT
NotificationReliabilityIT        ObservabilityIT
PublicBookingIdempotencyIT       ReservationInvoiceIT
ReservationOwnershipIdorIT       SitewideCapacityConcurrencyIT
UserDataExportIT
```

Approx. **78 integration test methods** (prior recorded run: 75; +3 `GalleryIT`).

---

## 2. `ReservationServiceImpl` — the target

- **1,938 lines** (was ~1,904 before the state-machine pass, ~1,960 at its peak).
- Owns, in one class: create / update / status-transition / cancellation /
  currency recalculation / camping stats / guide + chauffeur management **and
  invoice + proforma generation**.

### Invoice-generation code inside `ReservationServiceImpl` (this pass's target)

| Member | Lines (approx.) | Role |
|---|---|---|
| `onConfirmed(...)` — PROFORMA block | 766–803 | builds + persists the auto PROFORMA on `PENDING → CONFIRMED` |
| `onCompleted(...)` — FACTURE block | 827–867 | builds + persists the auto FACTURE on `→ COMPLETED` (only when `companyType != null`) |
| `generateFactureLater(UUID, CompanyType)` | 1546–1606 | ADMIN-triggered manual FACTURE; Phase-4 fail-closed company check |
| `populateInvoiceItems(Reservation, Invoice)` | 1771–1904 | the branchy core: HEBERGEMENT (accommodation-priced / per-person, night-grouping) · TOURS · EXTRAS → returns `{sumHt, sumTva}` |
| `generateProformaNumber()` / `generateFactureNumber()` | 1910–1930 | `DocumentSequence` pessimistic-locked per-year counters |
| `getTimbreFiscal(Reservation)` | 1933–1937 | Tunisian stamp duty, 1.000 TND in the reservation currency |
| `plain(BigDecimal)` | 1906–1908 | private helper used only by `populateInvoiceItems` |

Dependencies these use: `invoiceRepository`, `documentSequenceRepository`,
`paymentService.computePaymentSummary`, `currencyConfig.effectiveRate`, `Money.*`.
`invoiceService.getInvoicesByReservation` is used **once**, at the tail of
`generateFactureLater`, to shape the return value.

`applyRemise(...)` also lives near this code but belongs to the **pricing** path
(create / update), not invoicing — it stays.

---

## 3. Existing invoice test coverage (the safety net we start from)

`ReservationInvoiceIT` (2 methods, real Postgres):
- `confirmGeneratesAProformaWhoseHtPlusTvaReconcilesToTheAuthoritativeTtc` —
  165.000 TTC @ 7% → 154.206 HT + 10.794 TVA, one HEBERGEMENT line, unit price HT.
- `aLaterCataloguePriceChangeDoesNotMoveTheIssuedInvoiceOrItsReservation` —
  issued proforma + reservation snapshot immutable to a catalogue edit.

**Gaps in the net (addressed in this pass before extraction):**
- No test on the **FACTURE** path (`→ COMPLETED`), timbre fiscal, or the
  FACTURE `totalTtc = HT + TVA + timbre`.
- No test on **`generateFactureLater`** directly (the Phase-4 company guard,
  the completed-vs-now invoice date, the return value).
- No test on **EXTRAS** or **TOURS** invoice lines.
- No test on the **document sequence** (per-year, per-type, format `%03d/%d`).
- No test on **payment status** derivation on the invoice (UNPAID / PARTIALLY_PAID / PAID).

---

## 4. Standing findings carried in from earlier phases (not regressions)

| Area | State |
|---|---|
| Company isolation on operational entities | Designed (ADR-0002), business-blocked on OPEN-QUESTIONS Q1/Q2/Q4/Q9. |
| Shared `DocumentSequence` across two legal entities | Dormant (only Dunes bookable, zero real invoices). Accountant decision Q4. |
| Auto-PROFORMA path (`updateReservationStatus` → CONFIRMED) | Does **not** apply the Phase-4 fail-closed company check that `generateFactureLater` does — a proforma can be minted with `companyType = null` or `ROUTE_INSOLITE`. Dormant; same blocker as ADR-0002. Documented in the security audit. |
| Off-host backup destination (`OFFSITE_CMD`) | Unset — infra blocker. |
| Monitoring stack (Prometheus/Grafana) | Not deployed — infra blocker. |
| Live nginx / Cloudflare config | Unconfirmed against the real host — infra blocker. |
| Real deploy + rollback rehearsal | Never executed — infra blocker. |
| Gmail app password | Not rotated — credential-owner blocker. |
| GDPR legal sign-off (F-5.1–F-5.6) | Impossible from the repo — legal blocker. |

---

## 5. Working-tree state

`git status` shows a **large uncommitted diff — 160 files, +6492 / −1844** — the
accumulation of every hardening phase run in this working session (Phases 1–6,
the ops pass, the engineering-quality pass, the gallery-CMS work) **plus** this
pass. Nothing is committed. This is a process risk in its own right and is
called out in the final report's "remaining" section: the work needs to be
reviewed and committed in coherent chunks.

CI (`.github/workflows/ci.yml`) already runs, on every push/PR to `main`:
secret scan · typecheck · lint · web unit tests · prod-config validation ·
backend unit (surefire) · backend IT (failsafe, Testcontainers) ·
frontend fail-closed build check · optional live SEO canary.
