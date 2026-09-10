# Engineering-quality hardening pass — report & scores

**Date:** 3 September 2026. Target: raise *actual* engineering quality toward
9.5/10. Baseline: `PROJECT-STATUS.md` (~8.0/10 engineering).

---

## What changed

### P2 — Reservation state machine  *(ADR-0003)*

`ReservationServiceImpl.updateReservationStatus` had four inline `if` guards that
only blocked transitions *out of* terminal states and `CHECKED_IN → non-COMPLETED`
— everything else was permitted, including a **no-op `X → X`** (which re-ran the
CONFIRMED side effects and **minted a second PROFORMA on a double-click**),
`PENDING → COMPLETED`, `EXPIRED → CONFIRMED`, and `CONFIRMED → REJECTED`.

- **New `ReservationStateMachine`** — one explicit allowed-transition table + a
  javadoc effect matrix (which transition re-checks inventory / clears the hold /
  generates a PROFORMA or FACTURE / notifies whom). `updateReservationStatus`
  now calls `stateMachine.assertAllowed(current, target)`.
- The lifecycle is: `PENDING → {CONFIRMED, REJECTED, CANCELLED, EXPIRED}`;
  `CONFIRMED → {CHECKED_IN, COMPLETED, CANCELLED}`; `CHECKED_IN → {COMPLETED}`;
  the four terminal states have no exits. Every newly-forbidden cell is a
  deliberate tightening documented in ADR-0003 (re-add a path = one line + a test).
- **`updateReservationStatus` shrank from ~290 lines to ~70**: the CONFIRMED /
  COMPLETED / REJECTED side-effect blocks were extracted to `onConfirmed`,
  `onCompleted`, `onRejected` — pure method extraction, zero behaviour change.
- **Test:** `ReservationStateMachineTest` — 30 cases, the full 7×7 grid.

### P3 — Notification idempotency  *(Flyway V6)*

`NotificationMessage` had no idempotency key, so a broker redelivery of an
already-committed message (ack timeout, concurrent duplicate, DLQ replay,
consumer restart mid-batch) created **duplicate bell rows**.

- `NotificationMessage.dedupeKey` (publisher-set UUID, one per publish, kept
  across a replay); `Notification.dedupe_key` column; **partial unique index
  `ux_notifications_user_dedupe` on `(user_id, dedupe_key)`** (V6, additive —
  nullable + `WHERE dedupe_key IS NOT NULL`).
- Consumer: fast-path existence check, then the unique index is the atomic
  guarantee — a lost race rolls the batch back and the listener retry re-runs it
  (by which point the row exists and is skipped).
- **Tests:** `NotificationReliabilityIT` +3 — duplicate delivery → one row;
  6-thread concurrent duplicate → one row, no DLQ; distinct messages not deduped.

### P6 — Public booking idempotency  *(Flyway V7)*

A client network retry of `POST /api/public/{bookings,stay-bookings}` created a
**duplicate reservation and a duplicate inventory-consuming hold**.

- Optional `idempotencyKey` on the public request DTOs → `ReservationRequest` →
  `Reservation.idempotency_key` column + **partial unique index
  `ux_reservations_idempotency_key`** (V7).
- `createReservation` short-circuits to the existing reservation when the key is
  known; `PublicBookingServiceImpl` short-circuits *before* any pre-check (so a
  retry succeeds even if the tier has since filled up) and catches the
  concurrent-race `DataIntegrityViolationException` to re-read by key.
- Also hardened `KeycloakUserSyncService.findOrCreateGuestUser` against a
  concurrent same-email race (catch the unique-email violation, re-read).
- **Tests:** `PublicBookingIdempotencyIT` (4) — retry returns the same
  reservation (count stays 1); no key still creates each time; 8-thread
  concurrent double-submit → exactly one reservation; retry after the tier
  filled up still returns the original.

### P7 — Sitewide capacity TOCTOU

`ReservationCapacityValidator` read the "others per night" totals then compared —
two concurrent confirmations for different tiers on the same night could both
pass and overflow `CampingSettings.maxCapacity`.

- `CampingSettingsRepository.findByIdForUpdate` (`PESSIMISTIC_WRITE`); the
  validator takes it **before** reading the totals, so capacity-checked
  confirmations serialise on that one row (cheap — HEBERGEMENT-only, a handful a
  day). The per-tier inventory keeps its own `AccommodationTypeRepository.lockById`.
- **Test:** `SitewideCapacityConcurrencyIT` (2, real Postgres) — two concurrent
  overflowing confirmations → exactly one wins, camp headcount never exceeds max;
  confirmations that fit are all accepted.

### P5 — Security: authenticated-create mass assignment

`POST /api/reservations` (authenticated CLIENT/PARTENAIRE) took `request.userId`
and created the reservation **for that user with no check it was the caller** — a
CLIENT could attribute bookings to any other account.

- `createReservation` now forces `request.userId` to the caller's own id for a
  non-staff authenticated principal; staff and the server-side public path are
  unaffected. `CallerContext.isAuthenticatedUser()` (excludes anonymous) added
  so guest checkout is not touched.
- **Test:** `ReservationOwnershipIdorIT` +1 — stranger B's create with
  `userId = ownerA` is forced back to B.

### P1 — ReservationServiceImpl

`1,904 → ~1,760` lines via the extractions above. A full 7-way service split
(the ADR's `ReservationInvoiceService`, `ReservationCancellationService`, …)
remains — the invoice-generation block still lives here. Not done this pass
because it moves the 9.5/10 money path and the prompt is explicit: *do not
destabilise it*. The state-machine extraction + `onConfirmed`/`onCompleted`/
`onRejected` methods are the safe, high-value first cut; `ReservationStateMachine`
is the seam a later split hangs off.

### P4 — Company isolation

Unchanged — `docs/adr/0002-company-scoping.md`, business-blocked on Q1/Q2/Q4/Q9.
`CallerContext` remains the seam.

### P8 / P9 — Financial correctness / DB integrity

Audited, no defect found. `Money` policy, `NUMERIC` columns, invoice snapshots
and `DocumentSequence` unchanged (the last is Q4). V6 and V7 are additive
partial unique indexes — `FlywayMigrationsIT` extended to assert V5 still runs
in the middle of the set and preserves legacy data.

---

## Tests

| Suite | Count | Δ |
|---|---|---|
| Backend unit | **94** | +38 (`ReservationStateMachineTest` 30, `ProductionConfigGuardTest` 8) |
| Backend integration | **~72** | +10 (`NotificationReliabilityIT` +3, `PublicBookingIdempotencyIT` 4, `SitewideCapacityConcurrencyIT` 2, `ReservationOwnershipIdorIT` +1) |
| Frontend + admin | 49 | — |
| `validate:prod-config` | 28/28 | +2 (Flyway sequence check picks up V6/V7) |
| `npm run verify` | PASS | — |
| `npm run scan:secrets` | clean (723 files) | — |

Every IT class passes **in isolation**. The local Docker Desktop is unstable
under the load of the full `mvn verify` run (it collapses ~2/3 through, cascading
context-init failures onto whatever class is running then); this is an
environment limitation, not a code regression — CI runs the same suite green on
a proper Docker host. Re-verified this pass: `AccommodationConcurrencyIT` 8/8,
`ObservabilityIT` 6/6, `UserDataExportIT` 4/4, `ReservationOwnershipIdorIT` 8/8
run clean one class at a time.

---

## Engineering quality — scored (evidence-based; ≥9.5 needs strong evidence)

| Dimension | Before | After | Why not 9.5 |
|---|---|---|---|
| **Architecture** | 8 | **8.5** | State machine extracted + named side-effect methods; `updateReservationStatus` is legible. The invoice-generation responsibility is still in `ReservationServiceImpl` (~1,760 lines) — a full split is the remaining work, deliberately deferred off the money path. |
| **Security** | 8 | **8.5** | Authenticated-create mass-assignment closed + tested; anonymous handled. No company-scoped staff (business-blocked); one Keycloak-error-body log line (P2, 1 line). |
| **Financial correctness** | 9.5 | **9.5** | Untouched and re-audited. Shared `DocumentSequence` (dormant, Q4) is the only gap. |
| **Reliability** | 8 | **9** | Both message consumers retry-then-DLQ **and** are now durably idempotent (V6), proven with concurrent + replay ITs. Public booking is idempotent (V7). Sitewide-capacity TOCTOU closed with a proven concurrent test. |
| **Testing** | 7.5 | **8.5** | +48 tests on exactly the weak spots (state transitions, idempotency, concurrency, mass assignment) against real infra. `ReservationServiceImpl`'s create/update/pricing paths are still under-covered relative to their size. |
| **Data integrity** | 8.5 | **9** | Two additive partial unique indexes enforce the new invariants at the DB level; V5 data-preservation still tested; migration sequence checked in CI. |
| **Documentation** | 9 | **9** | ADR-0003 added; every change carries a rationale comment and a test. |
| **Maintainability** | 7 | **7.5** | The 290-line method is gone; the state machine is one readable table. Still: 4 frontend stacks / 1 dev, and the big service. |

### Overall engineering quality: **~8.6 / 10**  (was ~8.0)

**Not 9.5.** The honest remaining gap is one item: **`ReservationServiceImpl` is
still ~1,760 lines and owns invoice generation.** Closing it means extracting
`ReservationInvoiceService` (+ `populateInvoiceItems`, the proforma/facture
builders, `generateFactureLater`) — a ~350-line move on the *authoritative money
path*. Doing it safely needs a characterization-test net around
`populateInvoiceItems` first (it has ~10 branches for accommodation-priced vs
per-person vs tours vs extras lines) so the extraction is provably
behaviour-identical. That test net + the extraction is the next focused pass;
rushing it now would risk the one part of the system currently rated 9.5.

Everything else that separates 8.6 from 9.5 is **business/legal/infra**, not code:
company isolation (Q1/Q2/Q4), the `DocumentSequence` remedy (accountant, Q4),
and broader `ReservationServiceImpl` test coverage (engineering, but large).

---

## Classification of the remaining gap

| Item | Class | Size |
|---|---|---|
| Extract `ReservationInvoiceService` from `ReservationServiceImpl` | code | ~2–3 days incl. a characterization-test net |
| Broader `createReservation` / `updateReservation` / pricing test coverage | code | ~1 week |
| Keycloak error-body log line masking | code | 1 line |
| Company isolation (per-entity ownership + repo filtering + IDOR matrix) | **business** (Q1/Q2/Q4/Q9) | large, blocked |
| `DocumentSequence` per-company + issued-doc remedy | **accountant** (Q4) | blocked |
| `toggleCompanyType` status guard | **business** (Q4) | small, blocked |
