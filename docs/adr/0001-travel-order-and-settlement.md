# ADR-0001 — TravelOrder, OrderItem and internal settlement

**Status:** Accepted in principle · sequenced, not yet implemented
**Date:** 25 August 2026
**Supersedes:** nothing
**Source proposal:** [`docs/proposals/unified-travel-order-architecture.md`](../proposals/unified-travel-order-architecture.md)

---

## Decision

**Adopt the TravelOrder model.** Separating the *commercial* order from the
*operational* reservation is correct, and it is the right answer to the problem
the business actually has: a customer buys one trip that two legal entities
fulfil.

**Do not begin implementing it before the September release.** The proposal
describes roughly three to six months of work on a system that is currently
serving production traffic through three Angular applications. Starting it now
would miss the September date and leave the platform mid-migration with neither
model complete.

This ADR records what is accepted, what the proposal omits, and the order in
which it gets built.

---

## Context

Two legal entities — Route Insolite (Djerba, circuits) and Dunes Insolites
(Sabria, stays and activities) — share one platform. A customer buying a circuit
that overnights at the camp is buying from both, and should not have to know
that.

The proposal argues for:

```
ONE TRAVEL ORDER → ONE PAYMENT → MANY OPERATIONAL BOOKINGS → INTERNAL SETTLEMENT
```

That is sound. The rest of this document is about what it takes to get there
from where the code actually is.

---

## What the proposal gets right

These are accepted without reservation.

| Proposal | Assessment |
|---|---|
| **Commercial order ≠ operational reservation** (§6) | Correct, and the central insight. Each service needs its own availability, status, schedule and cancellation policy. Forcing them into one `Reservation` is why `ReservationServiceImpl` is 1,788 lines |
| **`ownerCompanyId` on every OrderItem** (§5) | Exactly right, and it is the fix for a real defect — company currently exists *only* on `Invoice`, so an uninvoiced reservation belongs to no entity and "what did Route Insolite sell in July?" is unanswerable |
| **Company as a first-class concept** (§11) | Agreed. Products, staff, order items and reporting all need it |
| **Price snapshots** (§13) | Necessary. Partially present already — `InvoiceItem` snapshots `description`, `unitPrice`, `quantity` and `tva` — but only at invoicing time. A reservation that is repriced before invoicing has no record of what was agreed |
| **`BigDecimal` / `NUMERIC(19,3)`** (§14) | Correct, and urgent independently of this ADR. Every monetary field is currently `Double`, on documents carrying 7% TVA and a fiscal stamp. Scale 3 is right — the millime |
| **Settlement separate from Payment** (§9) | Correct. What the customer pays and how it is allocated between two legal entities are different concerns with different lifecycles |
| **Role + company scope** (§19) | Agreed. Today a Sabria `CAMPING` user can read every Route Insolite reservation |
| **Availability holds** (§16) | Correct for the concurrency problem |
| **Payment idempotency, verified webhooks, server-side truth** (§17) | Correct — and see the gap below, because none of this exists yet |
| **Modular monolith, no premature microservices** (§20) | Strongly agreed. At this scale and team size, microservices would be a mistake |

---

## What the proposal omits

None of these invalidate it. All of them have to be answered before it can be
built.

### 1. There is no migration path

The document reads as greenfield. It is not. Today there is:

- a `Reservation` aggregate with six statuses, soft-delete, room distribution
  (`ReservationRepartition`), staff assignment, invoices and transactions;
- **three Angular applications in production** consuming `/api/reservations` —
  `admin-app`, `partner-app`, `camping-app`;
- 24 commits of history and live customer data.

`TravelOrder` has to coexist with `Reservation` through a strangler migration,
not replace it in one release. The proposal should say which of the two is
authoritative during the overlap, and for how long.

**Resolution:** `TravelOrder` becomes the commercial layer *above* `Reservation`.
`Reservation` stays as the operational booking record — it is already close to
what §6 calls `AccommodationReservation` / `ActivityReservation`. `OrderItem`
gets a foreign key to the reservation it produced. Nothing existing is deleted.

### 2. The inter-company invoice does not exist in the model

§10 defers the legal invoice model to "the accountant." That is the hardest part
of the whole proposal, and the model has to accommodate the answer.

If Route Insolite is merchant of record for a 570 EUR package containing 270 EUR
of Dunes services, then in most jurisdictions:

- Route Insolite issues a **customer invoice** for 570 EUR;
- Dunes Insolites issues an **inter-company invoice** to Route Insolite for
  270 EUR;
- those are different VAT treatments — tourism VAT on one, a B2B supply on the
  other.

`Settlement` and `SettlementLine` as proposed carry `grossAmount`,
`commissionAmount` and `netAmount` but have **no link to an invoice**. A
settlement line is an accounting intention; the invoice is the legal instrument.
They need to be connected.

**This also makes an existing defect worse.** `DocumentSequence` is unique on
`(type, year)` — both legal entities already share one invoice counter, so each
ledger has gaps. Adding inter-company invoices multiplies the problem. That flaw
must be fixed *before* settlement is built, not alongside it.

### 3. There is no payment provider

§8 and §17 assume an online payment provider with webhooks. There is none.

The current reality: `PaymentMethod` is `CASH | CREDIT_CARD | DEBIT_CARD |
BANK_TRANSFER | ONLINE | CHEQUE`, and `Reservation.paymentLink` is a plain
`String` an administrator pastes in by hand. There is no webhook handler, no
signature verification, no idempotency key, no provider integration of any kind.

Going from "an admin pastes a link" to "webhook-driven checkout that atomically
confirms bookings across two legal entities" is a project in itself, not a phase
item. It also needs a provider decision — in Tunisia, Paymee, Konnect or Flouci
for local cards, versus Stripe for international — and that decision has
consequences for currency, settlement timing and refunds.

### 4. The lifecycle has no cancellation path

§15 gives `DRAFT → PENDING_PAYMENT → PAID → CONFIRMING → CONFIRMED →
IN_PROGRESS → COMPLETED`, with `PAYMENT_FAILED` and `PAYMENT_REVIEW` branches.
**There is no `CANCELLED` state**, yet §18 describes full, partial and item-level
refunds. Refunds without a cancellation lifecycle is a contradiction.

The mapping to the existing `ReservationStatus`
(`PENDING | CONFIRMED | CHECKED_IN | CANCELLED | REJECTED | COMPLETED`) also
needs to be explicit — particularly `CHECKED_IN`, which has no equivalent in the
proposed order lifecycle because it is operational, not commercial. That is
actually evidence *for* the proposal's central point.

### 5. Cross-company overnights are already partly modelled

`ReservationTourHebergement` already represents "a tour that overnights at
accommodation" — precisely the Route-circuit-stays-at-Dunes-camp case. The
proposal reinvents this without acknowledging it. Any migration must decide
whether that entity becomes an `OrderItem`, survives underneath as the
operational record, or is retired.

### 6. Settlement currency is unspecified

The customer may pay in EUR while both entities keep books in TND.
`Reservation.exchangeRateApplied` exists, so the problem is known. Settlement
lines need to record which rate was applied and when, or the two entities will
disagree about what was owed.

### 7. `Company` as entity versus enum

§11 proposes a `Company` table with `taxIdentifier` and `legalName`. Today it is
a two-value enum. A table is right *eventually*; with exactly two entities, an
enum plus configuration is simpler and adequate. Introduce the table when a
third entity appears or when tax identifiers need to be data rather than code —
not before.

---

## The decision, sequenced

The proposal's own Phase 1–4 ordering is broadly right. It is re-sequenced here
against the September release and against defects that must be fixed first.

| Stage | Work | When | Why then |
|---|---|---|---|
| **0** | Ship the September release on the existing `Reservation` model, bookings arriving as `PENDING` and confirmed by staff | Now → 15 Sep | The deadline is real. Manual confirmation is how the business already operates |
| **1** | **Financial correctness first.** `BigDecimal` everywhere; per-company invoice sequences; restrict `toggleCompanyType` to `DRAFT`; audit log | R2 | These are live defects. Building settlement on a broken invoice sequence would multiply the damage |
| **2** | Flyway + `ddl-auto: validate`; authorization-matrix tests | R2 | No schema of this size should be introduced with Hibernate auto-migrating a live database and no test safety net |
| **3** | **Company as a first-class dimension** — on catalogue, reservations, statistics and staff roles | R3 | Proposal §11–12. Independently valuable, and a hard prerequisite for `OrderItem.ownerCompanyId` |
| **4** | `TravelOrder` + `OrderItem` as a commercial layer **above** `Reservation`, with price snapshots | Post-launch | The core of the proposal. Safe only once 1–3 are done |
| **5** | Payment provider, webhooks, idempotency, availability holds | Post-launch | Needs a provider decision first |
| **6** | `Settlement`, `SettlementLine`, inter-company invoices, reconciliation | Last | Depends on every stage above, and on the accountant's ruling |

**The ordering principle:** the proposal's Phase 1 puts `TravelOrder` first and
money types fourth. That is backwards. Introducing a new commercial aggregate on
top of `Double` money and a shared invoice sequence would bake both defects into
a second model. Fix the foundation, then build on it.

---

## Consequences

**Accepted:**

- `Reservation` is not the customer's order. It becomes the operational record
  beneath `OrderItem`, and its scope shrinks — which is also the honest way to
  break up a 1,788-line service class.
- Company becomes a first-class dimension across catalogue, orders, staff and
  reporting, not a flag on invoices.
- Money moves to `BigDecimal` with scale 3.
- The backoffice must be **company-aware from its first commit**. Retrofitting
  multi-tenancy costs three to four times building it in.

**Deferred, deliberately:**

- No `TravelOrder` table before the September release.
- No payment provider integration until one is chosen.
- No `Company` entity while two enum values are sufficient.

**Risks accepted:**

- The September release ships on a model known to be superseded. This is the
  right trade: it preserves the search rankings the business depends on, and
  nothing in the interim model has to be thrown away — `Reservation` survives
  underneath.
- Manual confirmation and manual payment links continue for now. That matches
  current operations and avoids a provider integration on the critical path.

---

## Open questions for the business

1. **Merchant of record.** For a mixed package, does Route Insolite sell the
   whole trip and buy Dunes services internally, or do both invoice the customer
   directly? §10 leaves this open and everything about settlement depends on it.
2. **Inter-company VAT treatment.** Needs the accountant, and it determines the
   invoice model.
3. **Payment provider.** Local (Paymee, Konnect, Flouci) or international
   (Stripe)? Affects currency, settlement timing and refunds.
4. **The existing shared invoice sequence.** What is the remedy for factures
   already issued from one counter across two entities? The accountant specifies
   this; a developer must not silently rewrite history in a migration.
