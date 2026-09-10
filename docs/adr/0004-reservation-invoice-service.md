# ADR-0004 — Extract invoice generation into `ReservationInvoiceService`

**Status:** accepted · 4 September 2026
**Supersedes part of:** the "big service" note in ADR-0003 and
`phase-engineering-hardening.md` §P1

## Context

`ReservationServiceImpl` was **1,938 lines** and owned, alongside reservation
create / update / status-transition / cancellation / currency / stats, the
**generation of PROFORMA and FACTURE invoices**:

- the PROFORMA block inside `onConfirmed` (`PENDING → CONFIRMED`)
- the FACTURE block inside `onCompleted` (`→ COMPLETED`)
- the near-identical FACTURE block in `generateFactureLater` (manual, ADMIN)
- `populateInvoiceItems` — the branchy HEBERGEMENT / TOURS / EXTRAS line builder
- `generateProformaNumber` / `generateFactureNumber` — `DocumentSequence` counters
- `getTimbreFiscal`

This is the authoritative money path. It was rated 9.5/10 for *correctness* but
its *location* — buried in a 1,900-line class, with three copies of the
payment-status ladder and two copies of the sequence-number logic — was the last
material architectural weakness (`PROJECT-STATUS.md` §9).

## Decision

Introduce **`ReservationInvoiceService`** (interface in `service/`, impl in
`service/impl/`) with exactly two operations:

```java
Invoice generateProforma(Reservation reservation, CompanyType companyType);
Invoice generateFacture (Reservation reservation, CompanyType companyType);
```

`ReservationServiceImpl` now **delegates**:

| Call site | Before | After |
|---|---|---|
| `onConfirmed` | ~37 lines building + saving the proforma | `reservationInvoiceService.generateProforma(res, companyType)` |
| `onCompleted` | ~40 lines building + saving the facture | `reservationInvoiceService.generateFacture(res, companyType)` |
| `generateFactureLater` | ~43 lines building + saving, then `getInvoicesByReservation` + `get(size-1)` | `generateFacture(...)` then `invoiceService.getInvoiceById(facture.getInvoiceId())` |

### What did NOT change (deliberately)

- **`Money`** is still the only arithmetic. Every `populateInvoiceItems` line was
  moved **verbatim**; the three payment-status ladders and the two
  sequence-number methods were collapsed to one helper each with identical logic.
- **`DocumentSequence`** semantics: still one pessimistic-locked
  (`findByTypeAndYearForUpdate`) counter per `(type, year)`, format `%03d/%d`.
  The shared-across-two-companies question (OPEN-QUESTIONS **Q4**, accountant) is
  untouched — out of scope.
- **VAT / timbre fiscal**: proforma = `HT + TVA`; facture = `HT + TVA + timbre`.
  Unchanged.
- **Company scoping**: `companyType` is written through exactly as before. The
  Phase-4 fail-closed guard in `generateFactureLater` (null → `DUNES_INSOLITES`,
  `ROUTE_INSOLITE` → `AccessDeniedException`) **stays with that caller** — the
  new service does not add or remove validation. The auto-proforma path's *lack*
  of that guard is a pre-existing, dormant finding (see the security audit),
  not introduced or fixed here.
- **Transaction boundary**: both methods use default `REQUIRED` propagation — the
  `DocumentSequence` lock and the invoice INSERT commit atomically with the
  reservation state change that triggered them, exactly as when the code was
  inline.
- **Entity across the controller boundary**: the service returns an `Invoice`
  *entity*, but only to another service. No controller sees it. The rule
  ("entities never cross the *controller* boundary") is intact.

### One behavioural fix, with a regression test

`generateFactureLater` previously returned
`getInvoicesByReservation(id).get(size - 1)`. `findByReservationIdWithItems` has
**no `ORDER BY`**, so once a proforma already existed the method could return the
**proforma** instead of the facture it had just minted. It now returns
`invoiceService.getInvoiceById(facture.getInvoiceId())` — deterministically the
new facture. Covered by
`ReservationInvoiceIT.generateFactureLater_isRejectedForRouteInsolite_defaultsToDunes_andReturnsTheFacture`.

## Consequences

- `ReservationServiceImpl`: **1,938 → 1,660 lines** (−278). It no longer imports
  `DocumentSequence` and no longer holds `DocumentSequenceRepository`.
- Invoice logic is in one ~260-line class with a single responsibility, unit-of-work
  clear, and one obvious place for the future company-scoping and
  `DocumentSequence`-per-company work to land.
- **Characterization net** (`ReservationInvoiceIT`, real Postgres): proforma
  HT+TVA↔TTC reconciliation · issued-invoice immutability to catalogue change ·
  **FACTURE with timbre fiscal, TTC = HT+TVA+timbre** · **`generateFactureLater`
  company guard + date + return value** · **document-sequence format + increment**.
  All green before and after the move.

## Remaining (unchanged by this ADR — tracked elsewhere)

- Company scoping of invoices — ADR-0002, business-blocked (Q1/Q2/Q4/Q9).
- Shared `DocumentSequence` across the two legal entities — accountant (Q4).
- Auto-proforma path missing the fail-closed company guard — dormant; same
  blocker.
- `InvoiceServiceImpl` (manual CRUD, `toggleCompanyType`) is a separate service
  and was not touched.
