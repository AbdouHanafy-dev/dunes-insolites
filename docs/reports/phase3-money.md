# Phase 3 — Monetary migration: `Double` → `BigDecimal`

**Status:** engineering-complete. Verified against real Postgres (Testcontainers)
on 2 Sep 2026. Pending business input is isolated and does **not** block deploy
(see §F-4).

---

## 1. What changed

The authoritative money path is now end-to-end `java.math.BigDecimal`:

```
catalogue price (numeric) → domain calc (Money) → reservation snapshot (numeric)
   → invoice line / HT / TVA / TTC (Money) → persistence (numeric) → API (JSON decimal)
```

No authoritative financial calculation uses `double`, `Double`, `float` or
`Float` any more. The only floating-point left in the money-adjacent code is the
admin **statistics dashboard**, which derives *percentage / growth ratios*
(display-only, never fed back into a price, invoice or payment) — documented in
`StatisticsService`.

## 2. The single rounding policy — `com.camping.duneinsolite.money.Money`

One class holds the policy and performs all money arithmetic:

| Constant | Value | Meaning |
|---|---|---|
| `SCALE` | `3` | the millime |
| `MODE` | `HALF_UP` | rounding convention |
| `WORKING_SCALE` | `SCALE + 4` | internal precision for divisions before the final round |

Rules enforced by code review + this class's javadoc:

- **Never** `new BigDecimal(double)` — use `Money.of(String)` / catalogue values.
- **Never** scatter `setScale(...)` — call `Money.round` / the arithmetic helpers.
- Tax on TTC-stored prices: `HT = TTC / (1 + rate/100)`, `TVA = TTC − HT`, each
  rounded once (`Money.htFromTtc` / `Money.taxFromTtc`).
- Comparisons use `compareTo` (scale-insensitive) via `Money.eq/lt/gt/gte`,
  never `BigDecimal.equals`.
- `null` money stays `null` through `multiply` / `divide` (a NULL price is "not
  configured", never silently `0`). `Money.nz` is the explicit opt-in to 0.

### F-4 (accountant) — isolated, not blocking

`HALF_UP` at scale 3 is the convention this codebase has always used. The
accountant's ruling on scale / rounding / VAT convention changes `SCALE` and
`MODE` **in this one class** and nothing else. Historical rows are **not**
recalculated by any migration — only their storage type changes.

## 3. Database — `V5__money_to_numeric.sql`

Every monetary column: `double precision → numeric(15,3)`.
Every rate column (`tva`, `invoices.tva_rate`): `→ numeric(6,3)`.
`reservations.exchange_rate_applied → numeric(12,6)`.

Conversion is `ALTER COLUMN x TYPE numeric(P,S) USING x::numeric(P,S)` — Postgres
converts `double → numeric` exactly, and binary-float noise
(`0.30000000000000004`) rounds to the millime, which is the value that was always
intended. **`average_rating` is deliberately left `double`** (a review rating,
not money).

Applied via Flyway only. `ddl-auto: validate`. Never `update`.

**Verified** (`FlywayMigrationsIT`):
- fresh empty DB builds fully through V5; re-run is a no-op;
- `flyway.validate()` passes (checksums / ordering);
- a DB migrated only to V4, seeded with a legacy `double` row (`4.9`), then
  migrated to V5: column becomes `numeric`, value reads back `4.900` at scale 3.

## 4. Historical-data safety

- No migration recalculates an existing invoice, reservation or transaction.
- Accommodation price snapshots (`ReservationTourType.accommodation*`) are
  unchanged in meaning; `ReservationInvoiceIT` proves a later catalogue price
  change does **not** move an already-issued invoice or its reservation total.
- `NULL` is preserved as `NULL` everywhere (no global `NULL → 0`).

## 5. Frontend

`packages/api-types`: money stays a TypeScript `number` (JSON decimal). Wire
convention: **3 decimal places (millime)**, server-authoritative.

The two booking forms (`StayReservationForm`, `BookingFlow`) show a
**display-only** estimate (`priceFrom × qty`/`× party`) that is **never
submitted** — the payloads carry slugs, quantities, party size and contact only;
the server computes the authoritative price. Both sites are commented as such.

## 6. Tests

| Suite | Count | Notes |
|---|---|---|
| `MoneyTest` | 8 | rounding boundaries (`0.0005`, `99.9995`), NULL/zero semantics, scale-insensitive compare, zero-rate tax |
| backend unit (`backend:test:unit`) | 46 | all green |
| backend IT (`backend:test:it`) | 50 | all green — incl. `ReservationInvoiceIT` (booking → confirm → proforma; HT+TVA reconciles to TTC to the millime; catalogue change doesn't move an issued invoice) and the V5 data-preservation test |
| frontend `test:web` | 25 | all green |

`npm run verify` (typecheck + lint + web tests + backend unit + prod-config):
green. `validate-prod-config`: 26 checks pass.
