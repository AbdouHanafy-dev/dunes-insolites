# Cross-entity data-sharing inventory (Q10 technical input)

This is a **technical inventory only** — what is shared, where, and why the
code shares it. It does not decide, assume, or imply a legal basis for that
sharing. That decision belongs to whoever handles privacy/legal for the
business (see `docs/OPEN-QUESTIONS.md#q10`) and this document is what they
need to make it: a real map of where the architecture currently treats Dunes
Insolites and Route Insolite as one entity, versus where it already
separates them.

Compiled 30 Aug 2026 by tracing the actual schema and code — not from memory
of past audits, several of which had gone stale (see `ARCHITECTURE.md`'s
corrected §13). Every row below was checked directly against the running
Postgres instance and the current source.

---

## 1. What is actually shared today, live in Postgres

| Table | Company-scoped? | Real rows right now |
|---|---|---|
| `users` | **No column at all** | 5 (2 ADMIN, 1 CAMPING, 1 PARTENAIRE, 1 CLIENT — all staff/test accounts, zero real customer signups yet) |
| `reservations` | No column | 0 |
| `tour_types` (Dunes nuitées) | No column (implicitly Dunes-only by product) | 2, both real Dunes products |
| `tours` (Route Insolite circuits) | No column (implicitly Route-only by product) | 1, a dormant Djerba→Tataouine circuit — never booked (`reservation_tours` count: 0) |
| `extras` (activities) | No column | Dunes-only products today |
| `sources` (Facebook/Instagram/WhatsApp/Site web/Bouche à oreille) | No column | 5, referenced by whichever reservation cites them regardless of company |
| `invoices` | **Has `company_type`** | 0 — nothing invoiced yet |
| `pages`, `content_blocks`, `navigation_items`, `media_assets` (CMS) | **Have `company_type`** | Already correctly scoped per brand |

**The headline fact for whoever makes the Q10 call:** the sharing described
below is currently **structural, not active**. No real Route Insolite
customer has ever been created, and no reservation has ever mixed products
from both companies. The exposure is architectural readiness for a problem
that has not happened yet, not an ongoing violation with real people's data
in it today. That changes the moment Route Insolite's own booking flow goes
live and the first real customer registers there.

---

## 2. Why `users` has no company dimension — the technical reason, not a defense of it

- **One Keycloak realm** (`duneinsolite`) issues identity for every app —
  the Dunes vitrine, the future Route Insolite vitrine, both backoffices,
  `partner-app`, `camping-app`. A JWT from that realm is valid everywhere.
- **`findOrCreateGuestUser`** (`KeycloakUserSyncService`) — the guest-checkout
  path both a Dunes and a future Route Insolite booking would call —
  resolves a user **by email only** (`userRepository.findByEmail`). Book a
  Dunes nuitée today, a Route Insolite circuit next year with the same
  email, and it is the same `User` row, same `userId`, on purpose: that is
  what lets `ReservationTourHebergement` exist at all (a Route circuit that
  overnights at the Dunes camp — see root `CLAUDE.md`) without a duplicate
  identity problem.
- This is the exact mechanism Q10 is about: a Route Insolite customer's
  name/email/phone becomes visible to anything that queries `users` by that
  shared identity — including Dunes-side staff tooling — with no code-level
  wall between the two.

## 3. Why `reservations` has no company dimension

`Reservation.reservationType` (`HEBERGEMENT` / `TOURS` / `EXTRAS`) says *what
kind* of product was booked, not *which company* sold it. Company is
inferred today only by which repository the line items point at
(`TourType` = Dunes, `Tour` = Route) — there is no stored, queryable
`company` column on the reservation itself. `ARCHITECTURE.md` §13 (High #4)
already names this; this document adds the concrete consequence for privacy
purposes: **"show me every Route Insolite customer's data" is not a query
this schema can answer directly** — it requires joining through the line
items, which is fragile and easy to get wrong under time pressure (an
incident response scenario, for instance).

## 4. Where company **is** already enforced, cleanly

- **The Dunes vitrine frontend never calls anything Route-Insolite-shaped.**
  Verified directly: zero references to `/api/tours` (the Route/`Tour`
  endpoint family) anywhere in `frontend/`. The public booking API
  (`PublicBookingServiceImpl`) only ever touches `TourTypeRepository` and
  `ExtraRepository` — the `Tour` entity is never reachable from a guest on
  `www.dunes-insolites.com`.
- **CMS content** (`Page`, `ContentBlock`, `NavigationItem`, `MediaAsset`)
  already carries `company_type` and is filtered by it correctly — this part
  of the platform was built with the two-brand split in mind from the start.
- **Invoices** carry `company_type` — the one place money documents already
  know which legal entity they belong to.

## 5. The one place sharing becomes a live risk, not just a latent one

`ReservationServiceImpl.generateFactureLater(reservationId, companyType)` —
`companyType` is a **free parameter an ADMIN types in**, with no check
against what the reservation actually contains (there is nothing to check
against yet, since `TourType`/`Tour`/`Extra` carry no company field either).
Nothing today stops an admin from generating a Route Insolite invoice for a
reservation that only contains Dunes products, or vice versa. Separately,
`InvoiceServiceImpl.toggleCompanyType` can flip an **already-issued,
numbered, sent** invoice's legal identity with no status check at all
(`ARCHITECTURE.md` §13, Critical #2 — still live, re-confirmed here, not
newly found). Both are pre-existing, already-tracked items — flagged here
because they are exactly the code Q10's eventual answer will need to change:
whatever legal basis is decided, it likely implies a *stored* company field
on the product catalogue and the reservation, not a value staff type in by
hand at invoice time.

---

## 6. What this means for the architecture, going forward

Not a decision — a description of what the current design already leaves
room for, so a future fix doesn't have to fight the schema:

- `TourType`, `Tour`, and `Extra` have no `company` column today; adding one
  is additive (nullable, backfillable from which repository the row already
  lives in) — not a breaking migration.
- `Reservation` has no `company` column; the same is true there, and would
  let `generateFactureLater` validate `companyType` against reality instead
  of trusting whoever clicks the button.
- `users` staying company-agnostic is a **feature**, not just debt — it's
  what makes `ReservationTourHebergement` (a Route trip overnighting at
  Dunes) representable at all. The Q10 answer needs to account for this:
  "give every company its own customer table" would break that model, not
  just add a column.

See `ARCHITECTURE.md` §14.1 ("The commercial layer — accepted, not yet
built") for how `TravelOrder` is already planned to sit above `Reservation`
for exactly this kind of cross-company trip — Q10's answer should be made
compatible with that plan, not decided in isolation from it.
