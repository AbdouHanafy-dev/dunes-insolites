# ADR-0001 — TravelOrder as the commercial parent of Reservation

**Status:** Accepted · sequenced, not yet implemented
**Date:** 25 August 2026
**Source proposal:** [`../proposals/unified-travel-order-architecture.md`](../proposals/unified-travel-order-architecture.md)
**Blocked by:** [`../OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) Q1, Q2, Q5

---

## Decision

Introduce **`TravelOrder`** as the commercial parent of one or more existing
`Reservation` records.

```
                    CUSTOMER
                        │
                        ▼
                  TRAVEL ORDER  #TRIP-001
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     RESERVATION   RESERVATION   RESERVATION
       Circuit        Camp          Quad
     ROUTE INSOLITE  DUNES         DUNES
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                   ONE PAYMENT
```

`TravelOrder` is **commercial** — one trip, one checkout, one payment.
`Reservation` is **operational** — what a company actually has to deliver, on a
date, with capacity and staff.

The change to `Reservation` is two nullable columns:

```
Reservation
├── travelOrderId   ← nullable FK. NULL = a trip of one
└── companyType     ← nullable, backfilled to DUNES_INSOLITES
```

**Two layers, not three.** An earlier revision of this ADR accepted the source
proposal's `TravelOrder → OrderItem → Reservation`. That is superseded.

---

## Why two layers

`Reservation` is already the line-item container:

```java
List<ReservationTourType> tourTypes;    // stays
List<ReservationTour>     tours;        // circuits
List<ReservationExtra>    extras;       // add-ons
List<Participant>         participants;
```

An `OrderItem` layer would duplicate price, quantity, product reference and
status in a parallel structure — two places to change when pricing changes, and
two models of the same concept.

The decisive argument is migration cost. This model is **strictly additive**:

| | `OrderItem` model | This model |
|---|---|---|
| New tables | 2 (`TravelOrder`, `OrderItem`) | 1 (`TravelOrder`) |
| Changes to `Reservation` | Replaced as the booking record | 2 nullable columns |
| Impact on the 3 Angular apps | Reservation flow rewritten | **None** |
| Existing rows | Need backfill into `OrderItem` | `travelOrderId = NULL`, still valid |
| Ship incrementally? | No — big-bang release | Yes |

Existing reservations become trips of one. `admin-app`, `partner-app` and
`camping-app` keep working untouched.

---

## What the source proposal got right

Accepted without reservation, and carried into this model:

- **Commercial order ≠ operational reservation.** The central insight, and the
  reason `ReservationServiceImpl` is 1,788 lines — it is doing both jobs.
- **Company ownership on every purchased service.** Today company exists *only*
  on `Invoice`, so an uninvoiced reservation belongs to no entity and "what did
  Route Insolite sell in July?" is unanswerable.
- **Price snapshots.** Partially present — `InvoiceItem` snapshots
  `description`, `unitPrice`, `quantity` and `tva` — but only at invoicing time.
  A reservation repriced before invoicing has no record of what was agreed.
- **`BigDecimal` / `NUMERIC(19,3)`.** Correct and urgent independently of this
  ADR. Scale 3 is the millime.
- **Settlement separate from payment.** What the customer pays and how it is
  allocated between two legal entities are different concerns.
- **Role + company scope.** Today a Sabria `CAMPING` user can read every Route
  Insolite reservation.
- **Availability holds**, **payment idempotency**, **verified webhooks**,
  **server-side payment truth**, **modular monolith over microservices** — all
  correct.

---

## What is not yet resolved

### 1. "One invoice" is not legally available

An invoice is issued **by** a legal entity. There are two. A single fiscal
invoice covering a Route circuit and a Dunes stay does not exist as an
instrument — whichever name is at the top is asserting it sold all of it.

Three options, in order of preference:

| Option | Customer sees | Internally |
|---|---|---|
| **Voucher + per-entity invoices** *(recommended)* | One trip confirmation document | Each entity issues its own fiscal invoice for what it sold |
| **Merchant of record** | One invoice from Route Insolite | Dunes issues an inter-company invoice to Route — different VAT treatment, and a document type the model does not have |
| **Two invoices** | One payment, two invoices | Simplest; slightly worse experience |

The recommended option keeps one customer-facing artefact without inventing a
legal instrument. **This is `OPEN-QUESTIONS.md` Q1 and it is the accountant's
call.** `Invoice` currently hangs off `Reservation`; whether it moves to
`TravelOrder`, stays, or needs both depends entirely on the answer.

### 2. Reservation granularity — per product or per company?

The worked example splits per product:

```
#D-001  Desert Camp   (Dunes)
#D-002  Quad Ride     (Dunes)
```

The existing aggregate would naturally hold both in **one** Dunes reservation
with two line items — that is what the `tourTypes` and `extras` collections are
for.

- **Per product** — independent status, schedule and cancellation. Cancelling
  the quad does not touch the camp booking.
- **Per company** — one reservation per company per trip. Camp staff see one
  booking to prepare, not two. Matches the current model, so no migration.

Neither is wrong. Per-company is cheaper and probably matches how the camp
actually works. This determines whether `Reservation` stays as-is or becomes
single-product, so it must be decided before implementation. **Q2.**

### 3. The customer journey crosses a domain boundary

`www.route-insolite.com` and `www.dunes-insolites.com` are different origins.
**They cannot share a cookie.** No browser mechanism carries a cart between them.

| Option | Trade-off |
|---|---|
| **One checkout domain** *(recommended)* — both sites hand off to `book.dunes-insolites.com`, which owns the TravelOrder session | Cleanest; also keeps the two brands' content domains separate for SEO while unifying the transaction |
| Signed order token in the URL | Works, but tokens in URLs leak into logs, history and referrers — needs short expiry |
| One domain, two brand sections | Best SEO consolidation, biggest brand change |

**Q5.**

### 4. Other gaps in the source proposal

- **No payment provider exists.** `PaymentMethod` is
  `CASH | CREDIT_CARD | DEBIT_CARD | BANK_TRANSFER | ONLINE | CHEQUE`, and
  `Reservation.paymentLink` is a plain `String` an administrator pastes in. No
  webhook handler, no signature verification, no idempotency. Going from that to
  webhook-driven checkout across two legal entities is a project, not a phase
  item, and needs a provider decision first. **Q3.**
- **No `CANCELLED` state** in the proposed lifecycle (§15), which nonetheless
  describes full, partial and item-level refunds (§18). Note also that
  `CHECKED_IN` has no commercial equivalent — which is evidence *for* separating
  the two lifecycles.
- **Settlement currency unspecified.** The customer may pay EUR while both
  entities keep books in TND. `Reservation.exchangeRateApplied` exists, so the
  problem is known; settlement lines must record which rate applied and when.
- **`ReservationTourHebergement` already exists** and models "a tour that
  overnights at accommodation" — precisely the cross-company case. Any migration
  must decide whether it survives as the operational record or is retired.
- **`Company` as entity vs enum.** A table with `taxIdentifier` and `legalName`
  is right *eventually*. With exactly two entities, an enum plus configuration is
  adequate. Introduce the table when a third appears.

---

## Sequencing

The source proposal puts `TravelOrder` first and money types fourth. **That is
inverted.** Building a new commercial aggregate on top of `Double` money and an
invoice counter shared between two legal entities bakes both defects into a
second model.

| Stage | Work | When |
|---|---|---|
| **0** | Ship on the existing `Reservation` model. Bookings arrive `PENDING`, staff confirm manually | → 15 Sep |
| **1** | `BigDecimal` everywhere · per-company invoice sequences · restrict `toggleCompanyType` to `DRAFT` · audit log | R2 |
| **2** | Flyway + `ddl-auto: validate` · authorization-matrix tests | R2 |
| **3** | Company as a first-class dimension — catalogue, reservations, statistics, staff roles | R3 |
| **4** | `TravelOrder` + `travelOrderId` on `Reservation` + price snapshots | Post-launch |
| **5** | Payment provider, webhooks, idempotency, availability holds | Post-launch |
| **6** | `Settlement`, `SettlementLine`, inter-company invoices, reconciliation | Last |

Stage 3 is the real prerequisite: `Reservation.companyType` must exist and be
backfilled before `TravelOrder` means anything.

---

## Consequences

**Accepted:**

- `Reservation` is not the customer's order. It becomes the operational record
  beneath `TravelOrder`, and its scope shrinks — the honest way to break up a
  1,788-line service class.
- Company becomes a first-class dimension, not a flag on invoices.
- Money moves to `BigDecimal`, scale 3.
- The backoffice is **company-aware from its first commit**. Retrofitting
  multi-tenancy costs three to four times building it in.
- The vitrine is **brand-configurable by hostname**, never hardcoded, so a
  second brand is configuration rather than a fork.

**Deferred deliberately:**

- No `TravelOrder` table before the September release.
- No payment provider until one is chosen.
- No `Company` entity while two enum values suffice.
- No `OrderItem`, now or later — `Reservation` fills that role.

**Risks accepted:**

- September ships on a model known to be superseded. Correct trade: it preserves
  the search rankings the business depends on, and nothing is thrown away —
  `Reservation` survives underneath, gaining two columns.
- Manual confirmation and manual payment links continue. That matches current
  operations and keeps a provider integration off the critical path.
