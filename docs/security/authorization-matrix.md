# Authorization matrix

**Date:** 4 September 2026 · **Method:** every `@*Mapping` in `controller/**` read
against its `@PreAuthorize`, then the service method it calls read for an
*independent* ownership check (controller annotations alone are not trusted).

Roles: **anon** (no token) · **CLIENT** / **PARTENAIRE** (customer) · **CAMPING**
(camp staff) · **ADMIN**. `@perm.can('X','L')` = the DB permission matrix
(`RolePermissionServiceImpl`: ADMIN always FULL, CLIENT always NONE, CAMPING /
PARTENAIRE from `role_permissions`). Today CAMPING reaches READ on
`RESERVATIONS` and FULL on `INVOICES`/`TRANSACTIONS`/`TOUR_TYPES`/`EXTRAS`;
everything else NONE.

## Legend

- **✅ enforced** — controller role gate **and** a service-layer ownership/authority check
- **🔒 role-only** — staff-only endpoint, no per-row ownership dimension needed
- **🌐 public** — deliberately `permitAll`

---

## Reservations (`/api/reservations`, `ReservationServiceImpl`)

| Endpoint | Controller gate | Service-layer check | Verdict |
|---|---|---|---|
| `POST /` create | CLIENT/PARTENAIRE/ADMIN/CAMPING | non-staff authenticated principal → `request.userId` **forced to caller** (`createReservation`); mass-assignment closed | ✅ (`ReservationOwnershipIdorIT`) |
| `GET /{id}` | `isAuthenticated()` | `caller.requireStaffOrOwner(res.owner)` | ✅ |
| `PATCH /{id}/status` | ADMIN/CAMPING/PARTENAIRE/CLIENT | non-staff → must be owner **and** may only set `CANCELLED` **and** 48h window; `ReservationStateMachine.assertAllowed` | ✅ |
| `PUT /{id}` | CLIENT/PARTENAIRE/ADMIN | `caller.requireStaffOrOwner`; blocked once CHECKED_IN/COMPLETED/CANCELLED | ✅ |
| `GET /user/{userId}` (+`/non-completed`) | `hasRole(ADMIN,CAMPING) or #userId == authentication.name` | query is per-user | ✅ (SpEL pins id to JWT subject) |
| `GET /` `/active` `/status/{s}` `/search` `/by-date` `/filter` `/camping/*` | ADMIN/CAMPING (or `@perm RESERVATIONS READ`) | — | 🔒 |
| `POST /{id}/staff...` · `DELETE /{id}` · `.../generate-facture` · guide/chauffeur | `hasRole('ADMIN')` | `generateFactureLater`: null→DUNES, ROUTE→`AccessDenied` | 🔒 + ✅ |
| `GET /my-reservations` | CLIENT/PARTENAIRE | `caller.requireUserId()` | ✅ |

## Reservation extras (`/api/reservation-extras`, `ReservationExtraServiceImpl`)

| Endpoint | Controller gate | Service-layer check | Verdict |
|---|---|---|---|
| `POST /` add extra | ADMIN/CAMPING/CLIENT/PARTENAIRE | **`caller.requireStaffOrOwner(reservation.owner)`** — added this pass | ✅ (`ReservationOwnershipIdorIT`) — *was an IDOR, see finding F-1* |
| `GET /{extraId}` | `isAuthenticated()` | `requireStaffOrOwner(extra.reservation.owner)` — added this pass | ✅ |
| `GET /reservation/{id}` | `isAuthenticated()` | `requireStaffOrOwner` on the reservation — added this pass | ✅ |
| `GET /` `/active` · `PUT` · `DELETE` | ADMIN/CAMPING | — | 🔒 |

## Invoices (`/api/invoices`, `InvoiceServiceImpl`)

| Endpoint | Controller gate | Service-layer check | Verdict |
|---|---|---|---|
| `GET /{invoiceId}` | `isAuthenticated()` | `caller.requireStaffOrOwner(ownerOf(invoice))` | ✅ |
| `GET /reservation/{id}` · `GET /factures/reservation/{id}` | `isAuthenticated()` | `requireReservationAccess(reservationId)` | ✅ |
| `POST /` · `PUT /{id}` · `GET /` `/factures` · `/user/{userId}` · `toggle-company-type` | `@perm INVOICES` | — | 🔒 |
| `DELETE /{id}` | `hasRole('ADMIN')` | — | 🔒 |
| `POST /{id}/send-proforma` `/send-facture` | ADMIN/CAMPING | — | 🔒 |

## Payments (`/api/reservations/{id}/payments`, `PaymentServiceImpl`)

| Endpoint | Controller gate | Service-layer check | Verdict |
|---|---|---|---|
| `POST /{id}/payments` | ADMIN/CAMPING/CLIENT/PARTENAIRE | `caller.requireStaffOrOwner(res.owner)`; amount validated ≤ remaining; server computes summary | ✅ |

## Notifications (`/api/notifications`, `isAuthenticated()` class-level)

| Endpoint | Service-layer check | Verdict |
|---|---|---|
| `GET /` `/unread-count` `/subscribe` (SSE) | scoped to `caller` JWT subject | ✅ |
| `PATCH /{id}/read` · `PATCH /read-all` · `DELETE /{id}` | owner check against JWT subject; silent no-op on a foreign/missing id so the response can't probe other accounts' notification ids (CLAUDE.md changelog, 29 Aug 2026) | ✅ |

## Me / data rights (`/api/users/me`)

| `GET /export` | `isAuthenticated()` → `UserDataExportService` keyed to `caller.requireUserId()`; no passwords/tokens/secrets/other users' rows | ✅ (`UserDataExportIT`) |

## Reviews (`/api/reviews`)

| `POST` `PUT /{id}` `GET /mine` | `isAuthenticated()` → `updateReview` checks `review.user == currentUserId` (JWT subject passed by controller) | ✅ |
| `DELETE /{id}` | `@perm REVIEWS FULL` (moderation) | 🔒 |

## Content / catalogue / ops CRUD

`PAGES` `CONTENT_BLOCKS` `MEDIA` `NAVIGATION` `REDIRECTS` `GALLERY`
`MAINTENANCE_WINDOWS` `TOURS` `TOUR_TYPES` `EXTRAS` `AVAILABILITY` — all per-method
`@perm.can(...)`, no per-row ownership dimension (single-tenant content). 🔒
`DeadLetterAdminController` `RolePermissionController` `SecurityOverviewController`
`StatisticsController` `SeoAnalyticsController` `ProduitController` — class-level
`hasRole('ADMIN')`. 🔒

## Public (`permitAll`, verified in `SecurityConfig`)

`POST /api/auth/{register,login,refresh,verify-email,forgot-password,reset-password}` ·
`GET /api/currency/rates` · `GET /actuator/health*` ·
`GET /api/tours` `/api/tour-types` `/api/extras` (+`/{id}`) ·
`GET /api/public/**` · `GET /media/**` ·
`POST /api/public/{bookings,stay-bookings,contact,subscribe}` (rate-limited).
No mutating admin path is `permitAll`. `RegisterRequest` has **no** `role` field —
role is a hard-coded parameter of `registerUser()`.
`/api/tours/active` + `/api/extras/active` are declared **before** the `/{id}`
wildcards (first-match-wins) so they stay `authenticated()`.

---

## Findings

### F-1 — `ReservationExtra` IDOR — **FIXED this pass** (was P1 / launch blocker)

`ReservationExtraServiceImpl` had **no `CallerContext`**. `POST /api/reservation-extras`
is open to CLIENT/PARTENAIRE; `createExtra` trusted `request.reservationId`
blindly. A CLIENT could:
- **add a paid extra to any other customer's reservation** (write IDOR — inflates
  the victim's `totalExtrasAmount`, applies the victim's `UserProductRemise`
  discounts), and
- **read any reservation's extras** via `GET /reservation/{id}` or `GET /{extraId}`
  (`isAuthenticated()` only).

Missed by the Phase-4 IDOR pass (which covered Reservation/Invoice/Payment).
**Fix:** `caller.requireStaffOrOwner(reservation.owner)` on `createExtra`,
`getExtraById`, `getExtrasByReservation`. **Regression test:**
`ReservationOwnershipIdorIT.reservationExtras_strangerCannotAddToOrReadAnotherCustomersReservation`.

### F-2 — auto-PROFORMA path has no fail-closed company check — **P2, dormant, business-blocked**

`updateReservationStatus(…, CONFIRMED, companyType, …)` → `generateProforma`
writes `companyType` straight through. `companyType` is a `@RequestParam(required=false)`,
so a proforma can be persisted with `companyType = null` or `ROUTE_INSOLITE` —
whereas `generateFactureLater` rejects both (Phase 4). Dormant: only Dunes
products are bookable and zero real invoices exist. **Not fixed** — the correct
fix derives company from the reservation's line items, which needs the company
model (OPEN-QUESTIONS Q1/Q2/Q4, ADR-0002). Documented, not guessed.

### F-3 — `StatisticsService` uses `double` for dashboard percentages — **ACCEPTED**

Growth %, revenue-share %, source-mix %. Not an authoritative monetary path (no
invoice, price or total is a `double`); these are display metrics recomputed on
every request. `Money`/`NUMERIC` covers every real monetary field. Left as-is.

### F-4 — `Extra`/`Tour`/`TourType.averageRating` is `Double` — **ACCEPTED**

A 0–5 rating average, not currency. `AggregateRating` JSON-LD is only emitted
when real reviews back it (CLAUDE.md). No money risk.

### F-5 — company isolation on operational entities — **business-blocked (unchanged)**

ADR-0002. A staff CAMPING account can read every reservation/invoice regardless
of which legal entity's product it is, because the entities carry no company
field. Correct today (one operating company); a hard R4 gate. Not a per-*user*
hole.
