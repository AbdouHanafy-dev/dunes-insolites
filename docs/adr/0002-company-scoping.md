# ADR-0002 — Company scoping & multi-entity data isolation

**Status:** Proposed · design only, **not implemented**
**Date:** 2 September 2026
**Depends on / blocked by:** [`../OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) Q1, Q2, Q4, Q9
**Relates to:** ADR-0001 stage 3 · ARCHITECTURE.md §13 items 4–7, §14.1
**Supersedes nothing.** Records the design so it can be built in one pass once
the business questions are answered, instead of being re-derived under launch
pressure.

---

## Context

The platform serves two legal entities — `DUNES_INSOLITES` and `ROUTE_INSOLITE`
— from one database (ADR: *"One database for both legal entities"*). Today the
company distinction exists in **exactly one place per surface**:

| Surface | Company field | Notes |
|---|---|---|
| `Page`, `NavigationItem`, `ContentBlock`, `MediaAsset` | `company_type NOT NULL` | CMS / vitrine content, already scoped in queries |
| `Invoice` | `company_type` **nullable** | set from a caller-supplied request param |

**Nothing operational or financial carries a company:** `Reservation`,
`Transaction`, `TourType`, `AccommodationType`, `Tour`, `Extra`, `User`,
`Notification`, `DeadLetterMessage`. Neither does the JWT (only
`realm_access.roles`), the `User` row, or any Keycloak group. The four roles
(`CLIENT`, `PARTENAIRE`, `CAMPING`, `ADMIN`) are **global**.

Consequences today (all tracked debt):

- A `CAMPING` user at Sabria can read every future Route Insolite reservation.
- The dashboard sums both entities' revenue into one meaningless figure.
- `generateFactureLater(?companyType=ROUTE_INSOLITE)` would mint a Route
  Insolite invoice against a reservation that has no company at all.
- "What did Route Insolite sell in July?" is unanswerable.

This is dormant, not exploited: **only Dunes Insolites launches (15 Sept)**;
Route Insolite is R4 and unlaunched; zero real invoices exist (re-confirmed
30 Aug 2026).

## Why this is a proposal, not a change

A correct company model requires decisions that are the business's, not a
developer's:

- **Q2 — reservation per product or per company?** Decides whether
  `companyType` lands on `Reservation` directly, or on a future
  `Reservation`-below-`TravelOrder` split, or on each line item.
- **Q1 — who invoices a mixed trip?** Decides whether `Invoice` ownership
  derives from `Reservation`, from `TravelOrder`, or from a `Settlement`.
- **Q4 — shared `DocumentSequence` remedy.** *"Highest open item… no safe
  default… needs the accountant."* Splitting company data and per-company
  numbering are the same fix.
- **Q9 — `partner-app` / `camping-app` future.** Decides whether staff company
  scope is modelled now for a role-aware shell or deferred.

`CLAUDE.md` is explicit: *"Do not 'fix' this by guessing a company-scoping
design now — it is a business/legal decision."*

---

## Proposed design

### 1. Company identity

Keep `CompanyType` as an **enum + configuration**, not a `Company` table —
introduce the table only when a third entity appears (same call as ADR-0001 §4).

### 2. Authenticated company scope — server-derived, never caller-supplied

```
Keycloak group  /companies/dunes-insolites   (staff assigned in Keycloak)
        │  mapped into the token as a group / attribute claim
        ▼
JWT claim  e.g.  "companies": ["DUNES_INSOLITES"]
        │  SecurityConfig.jwtAuthenticationConverter reads it
        ▼
CompanyScope   (request-scoped, in security/)
        │  scope.companies()  ·  scope.isGlobal()  ·  scope.contains(x)
        ▼
service authorization        reservationService.get(id) asserts
        │                    scope.contains(reservation.companyType)
        ▼
repository query             findByIdAndCompanyTypeIn(id, scope.companies())
```

- A **staff** principal (`ADMIN` / `CAMPING`) resolves to the company set from
  its Keycloak groups.
- A **customer** principal (`CLIENT` / `PARTENAIRE`) has no company scope; their
  access is by *ownership* (the reservation's `user_id`), which is what Phase 4
  hardened now — see §"Shipped now".
- **Global admin** is an explicit, named group (`/global-admins`) that sets
  `scope.isGlobal() == true`. Nothing else bypasses scope.
- **Missing / empty / unknown company claim on a staff principal → fail closed.**
  No default to "all", no "first company", no "treat as global".

`CallerContext` (added in Phase 4) is the seam this bolts onto — the company
predicate goes next to `isStaff()`.

### 3. Ownership matrix (target)

| Entity | Owner | Direct or inherited | Enforcement point |
|---|---|---|---|
| `Reservation` | `CompanyType` | **direct** — new nullable column, backfilled `DUNES_INSOLITES` | service + `findBy…AndCompanyTypeIn` |
| `ReservationTourType` / `ReservationTour` / `ReservationExtra` | inherit from `Reservation` | inherited | via parent |
| `Invoice` | inherit from `Reservation` (pending Q1) | inherited (column already exists, keep for the fiscal record) | service |
| `Transaction` | inherit from `Reservation` | inherited | service |
| `TourType` | `CompanyType` | **direct** — new column | catalogue query filter |
| `AccommodationType` | inherit from `TourType` | inherited | validate the whole chain on create/update |
| `Tour` | `CompanyType` | **direct** | catalogue query filter |
| `Extra` | `CompanyType` | **direct** | catalogue query filter |
| `Notification` | `User` + `targetRoles` (already per-user) | — | already scoped; add company filter to role-targeted staff notifications |
| `DeadLetterMessage` | inherit from the referenced `Reservation` | inherited | filter the admin list by `scope` unless global |
| `Page` / `NavigationItem` / `ContentBlock` / `MediaAsset` | `CompanyType` | direct | **already enforced** |
| `User` | **none** — a customer may book from either brand | — | scoped through the reservation, never pinned to one company |

### 4. Repository strategy

- **Direct ownership** (`Reservation`, `TourType`, `Tour`, `Extra`) — add
  `company_type` and prefer `findByIdAndCompanyTypeIn(id, scope)` over
  `findById` then check. Fetching only authorized rows avoids loading a foreign
  record before the check (STEP 16).
- **Inherited ownership** (`Invoice`, `Transaction`, `AccommodationType`,
  `DeadLetterMessage`) — enforce through the parent; do **not** duplicate
  `company_type` onto them purely for convenience. `Invoice.company_type` stays
  only because it is part of the issued fiscal document.
- **Cross-entity relationship attacks** (`AccommodationType` of company A under a
  `TourType` of company B; `Invoice` A on `Reservation` B) — validate the full
  chain on the write path, reject a mismatch with 403.

### 5. 403 vs 404 convention

**403 Forbidden**, consistently, via
`org.springframework.security.access.AccessDeniedException` →
`GlobalExceptionHandler` (already wired). Rationale: IDs are UUIDs (not
enumerable), and the existing `updateReservation` owner check already returns
403 — matching it avoids per-endpoint divergence. Notification endpoints keep
their silent no-op (they were designed against enumeration and that stands).

### 6. Migration

- One new **additive** Flyway migration (`V6…`), never touching V1–V5.
- `ALTER TABLE reservations ADD COLUMN company_type varchar(...)` **nullable**,
  then `UPDATE … SET company_type = 'DUNES_INSOLITES' WHERE company_type IS NULL`
  — sound **only because** every existing product is Dunes (confirmed). Same for
  `tour_types`, `tours`, `extras`.
- **If, when this is built, any Route Insolite operational data already exists,
  STOP** — the backfill is then a data-migration decision (which rows belong to
  which entity), not a default. Record it as such, do not guess.
- Keep `ddl-auto: validate`.

### 7. Statistics & settlement

Out of scope for this ADR — they are ADR-0001 stages 3 and 6. Once
`Reservation.companyType` exists, the dashboard queries gain a
`company_type IN (:scope)` filter and a per-company breakdown.

---

## Shipped now (Phase 4, this session) — does not need the business questions

Per-**user** IDOR holes were real regardless of company scoping and are fixed:

| Fix | Where |
|---|---|
| `GET /reservations/{id}` — staff-or-owner check | `ReservationServiceImpl.getReservationById` |
| `PATCH /reservations/{id}/status` — non-staff may only cancel their **own** | `ReservationServiceImpl.updateReservationStatus` |
| `PUT /reservations/{id}` — unified onto the shared staff-or-owner rule | `ReservationServiceImpl.updateReservation` |
| `GET /invoices/{id}`, `/invoices/reservation/{id}`, `/invoices/factures/reservation/{id}` — staff-or-owner | `InvoiceServiceImpl` |
| `POST /reservations/{id}/payments` — staff-or-owner (the controller comment claimed a check that did not exist) | `PaymentServiceImpl.recordPayment` |
| `generateFactureLater` — **fail closed**: absent `companyType` → `DUNES_INSOLITES`; explicit `ROUTE_INSOLITE` → 403 | `ReservationServiceImpl.generateFactureLater` |
| `CallerContext` — one server-side seam for "staff or owner", ready to carry the company predicate | `security/CallerContext.java` |

Covered by `ReservationOwnershipIdorIT` (real Postgres): owner allowed,
stranger 403, staff allowed, and the `generateFactureLater` company guard.

## Not done, deliberately

- No `company_type` on any operational entity.
- No Keycloak group / JWT claim / `CompanyScope` object.
- No company filter on notifications, DLQ, catalogue, statistics.
- `toggleCompanyType` still has no status check (ARCHITECTURE.md §13 Critical
  #2 / Q4) — untouched here.
- No `AuthController.register` change — it already returns `UserResponse`
  (no password, no hash, no Keycloak internal fields); debt #16 closed 29 Aug.

---

## Consequences

**Accepted:** September ships single-company. Staff company isolation does not
exist until stage 3 — acceptable because there is one company and its staff are
trusted across all of its data.

**Risk accepted:** the day Route Insolite onboards staff or data, this ADR must
be implemented *before* they get accounts — otherwise a Route `CAMPING` user
sees Dunes reservations and vice-versa. This is a hard gate on R4, not a
nice-to-have.
