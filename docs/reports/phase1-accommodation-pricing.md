# Phase 1 — Accommodation pricing: audit & design

## CURRENT DOMAIN

```
TourType            The backend's "nuitée" entity (also carries Route Insolite
                    multi-day circuits — shared shape). Holds FOUR prices:
                    passenger/partner × adult/child, all `Double`, all NOT NULL,
                    stored TTC (tax-inclusive), + a `tva` percentage. Has a
                    `slug` (legacy WordPress URL). NO accommodation concept.

Accommodation       Exists ONLY on the frontend:
                      • packages/api-types `Accommodation` { slug, title,
                        tagline, description, image, priceFrom, sleeps,
                        features }
                      • frontend/lib/data/stays-i18n/fr.ts — real content for
                        `nuitee-campement-desert`: 3 tiers
                          desert-tent  priceFrom 95   "Jusqu'à 2 personnes"
                          desert-room  priceFrom 125  "Jusqu'à 3 personnes"
                          dune-suite   priceFrom 165  "Jusqu'à 4 personnes"
                        `bivouac-desert-tunisie` has NO accommodations array.
                    Backend: PublicStayResponse.accommodations is hardcoded
                    `List.of()` — always empty. NO entity, NO table, NO price.

StayBooking         Frontend wire type (packages/api-types). Carries
                    `accommodationSlug` + `accommodationQty` (1–6).

Reservation         Aggregate root. HEBERGEMENT reservations own
                    `ReservationTourType` lines (the "stay" line — snapshots
                    name/description/adultPrice/childPrice/nights/tva from
                    TourType at booking, keyed by `catalogTourTypeId`) and
                    `ReservationRepartition` rows (tenteType SINGLE..X7 with a
                    capacity, `numberOfTentes` — a "how many tents of what size"
                    split, NO price attached).

Invoice             `populateInvoiceItems()` turns HEBERGEMENT
                    `ReservationTourType` lines into invoice items: one
                    "(Adulte)" line + one "(Enfant)" line per group, quantity =
                    headcount, unitPrice = price × nights, HT back-computed from
                    the TTC price and the tva rate.

Pricing             All `Double`. HEBERGEMENT total =
                    Σ ReservationTourType.getTotalPrice()
                    = Σ ((adults×adultPrice) + (children×childPrice)) × nights.
```

## CURRENT PRICING FLOW (guest books a stay)

```
customer            picks staySlug, date, partySize, accommodationSlug,
                    accommodationQty   (StayBookingFlow)
  ↓
frontend estimate   lib/stayBookings.ts (LOCAL SEED ONLY):
                      accommodation ? accommodation.priceFrom × accommodationQty
                                    : stay.priceFrom × partySize
                    — a PER-UNIT estimate. NOT what the backend charges.
  ↓
API                 POST /api/public/stay-bookings  (PublicStayBookingRequest)
  ↓
PublicBookingServiceImpl.createStayBooking
                      • resolves TourType by slug
                      • accommodationSlug → demandeSpecial FREE TEXT ONLY
                        ("Accommodation requested: dune-suite x2")
                      • builds a TourTypeSelectionRequest (tourTypeId, partySize
                        as adults, date)
  ↓
ReservationServiceImpl.buildTourTypeSnapshot
                      • price = TourType.passengerAdultPrice  (guest = not partner)
                      • snapshot onto ReservationTourType, nights forced to 1
                      • accommodation choice NEVER enters pricing
  ↓
persistence         reservation.totalAmount = calculateTotalTourTypesAmount()
                    = passengerAdultPrice × partySize        ← the wrong number
  ↓
confirmation email  reservationTotal(reservation) = totalAmount
  ↓
invoice             populateInvoiceItems — adult/child lines from the same
                    snapshot; accommodation invisible.
```

**Defect:** the guest picks Dune Suite (frontend shows 165 × qty) and is booked,
emailed and invoiced for `passengerAdultPrice × partySize` (currently the
placeholder rate, identical for all three tiers). The two price philosophies
also disagree — frontend per-unit, backend per-person.

## MISSING BUSINESS INPUTS

```
F-1  Pricing STRUCTURE for a camp nuitée. The repo points strongly to
     PER ACCOMMODATION TIER, PER UNIT, PER NIGHT:
       • frontend seed has 3 tiers with distinct prices, only for the fixed camp
       • frontend booking math is `priceFrom × accommodationQty`
       • `sleeps` ("Jusqu'à N personnes") = a per-unit capacity cap
       • `accommodationQty` field range 1–6; ReservationRepartition/TenteType
         already model "how many units of what capacity"
       • ARCHITECTURE §1: "Guests pick one accommodation"
     IMPLEMENTED ON THIS INFERENCE (per-unit). CONFIRM, or we switch the
     AccommodationType.pricingModel to per-person (adult/child) — a config
     change, no rewrite.
     Sub-questions:
       • Does a night ever cost different amounts on different dates
         (seasonality)? Assumed NO for launch.
       • Is a partner/agency rate applicable to camp nuitées at all? The
         frontend has no partner price for accommodations; `TourType` requires
         one. Assumed NO partner rate on accommodations for launch (guest rate
         only). Confirm.

F-2  The real 2026 numbers, once F-1 is confirmed:
       • desert-tent  — price per tent per night (TTC), tva %
       • desert-room  — price per room per night (TTC), tva %
       • dune-suite   — price per suite per night (TTC), tva %
       • capacity (max guests) per unit for each tier — the frontend `sleeps`
         says 2 / 3 / 4; confirm these are hard caps.
       • CURRENCY. Inferred TND (every backend price, the admin editor label,
         Reservation.currency default). The frontend `priceFrom: 95/125/165`
         is a bare number — if those are EUR the tiers need TND values.
       • `nuitee-bivouac`: confirmed it has NO accommodation choice — it keeps
         its current single nuitée price. Confirm that price and whether it is
         per-person or a flat per-guest bivouac rate.
       • Tax: inferred prices are stored TTC with a tva rate (matches the rest
         of the system). Confirm the tva rate for accommodation (TourType.tva
         is currently seeded 0; the admin editor default is 13).
```

## PROPOSED DOMAIN CHANGE

```
NEW  AccommodationType                (table: accommodation_types)
       id                uuid
       tour_type_id      uuid  FK → tour_types   (which nuitée it belongs to)
       slug              varchar        unique per (tour_type_id, slug)
       name              varchar
       description        text
       image_url         varchar
       capacity          int            max guests per unit (the `sleeps` cap)
       unit_price_ttc    numeric(15,3)  NULLABLE — null = "price not configured"
       tva_rate          numeric(6,3)   NULLABLE
       currency          varchar(3)     default TND
       display_order     int
       active            boolean        default true
       features          @ElementCollection (parity with the frontend shape)

NEW  ReservationTourType snapshot columns (all NULLABLE — additive):
       accommodation_type_id      uuid
       accommodation_name         varchar
       accommodation_units        int
       accommodation_unit_price_ttc  numeric(15,3)
       accommodation_tva_rate     numeric(6,3)

     ReservationTourType.getTotalPrice():
       if accommodation_unit_price_ttc != null && units > 0
            → unitPriceTtc × units × nights        (pure BigDecimal, ONE path)
       else → legacy ((adults×adultPrice)+(children×childPrice)) × nights

NEW  money/Money.java — the ONE rounding policy (scale 3, HALF_UP), isolated so
     F-4 can change it without touching call sites. Also the seam Phase 3
     (BigDecimal migration) builds on.

NEW  AccommodationPricingService.resolve(accommodationTypeId, units, nights)
       → PricedAccommodation snapshot   OR throws AccommodationPricingException:
         • not found                → 404
         • inactive                 → 422 "no longer available"
         • unit_price_ttc == null   → 422 "pricing not configured — contact the camp"
       Server is the ONLY price authority. The client sends units, never a price.

CHANGE  TourTypeSelectionRequest + PublicStayBookingRequest already carry the
        slug/qty; add `accommodationTypeId` + `accommodationUnits` to the
        internal TourTypeSelectionRequest. PublicBookingServiceImpl resolves the
        slug → AccommodationType within the nuitée, checks
        units × capacity ≥ partySize (enough beds), calls the pricing service,
        and puts the snapshot on the selection.

CHANGE  PublicStayMapper populates `accommodations` from real AccommodationType
        rows — but ONLY active ones WITH a price (`unit_price_ttc != null`), so
        the vitrine never shows a bookable option it cannot price. Unpriced rows
        are admin-visible (flagged) and vitrine-invisible.

CHANGE  populateInvoiceItems — when a HEBERGEMENT line is accommodation-priced,
        emit ONE accommodation line (description = accommodation name,
        quantity = units, unitPrice = unitPriceTtc × nights) instead of
        adult/child lines. Group key includes the accommodation fields.

NEW  AccommodationTypeController (ADMIN) — CRUD, filterable by ?tourTypeId=.
     admin UI wiring is a thin follow-up (nested list under a Hébergement).
```

## MIGRATION IMPACT

```
Schema        V3__accommodation_types.sql — new table + 5 nullable columns on
              reservation_tour_types. Strictly additive. ddl-auto:validate must
              pass (new entities exactly match V3).

Existing data Untouched. Every current reservation has NULL accommodation
              columns → getTotalPrice() takes the legacy branch → identical
              totals. Verified by an existing-reservation snapshot-stability test.

Contracts     packages/api-types: no request change (accommodationSlug/Qty
              already there). `Accommodation` response type already has
              priceFrom/sleeps. Backend PublicStayResponse.accommodations goes
              from always-`[]` to real rows — a strict superset, no breaking
              change; the field was already declared optional.

Frontend      lib/stayBookings.ts (seed estimate) already prices per unit — no
              change needed, and it is dev-seed-only anyway (item 3). The real
              displayed estimate on the vitrine now matches the backend.

Money         New fields are BigDecimal(15,3). The accommodation subtotal is
              computed entirely in BigDecimal; it converts to `double` ONLY at
              ReservationTourType.getTotalPrice()'s return, where it joins the
              legacy Double reservation total. That conversion boundary is
              explicit and documented — Phase 3 removes it by migrating the
              whole path.

Backfill      NONE invented. AccommodationType rows for desert-tent/room/suite
              are created by a seed script with unit_price_ttc = NULL and a
              header pointing at F-2. They are inert (vitrine-invisible,
              booking-rejected) until an admin sets real prices.
```

## TEST PLAN

```
AccommodationPricingServiceTest (unit, real arithmetic — no mocks of the math)
  • tent / room / suite each resolve to their own configured unit price
  • different tier selected  → different authoritative total
  • unit_price_ttc == null   → AccommodationPricingException (booking rejected)
  • inactive accommodation   → AccommodationPricingException
  • unknown id               → not-found
  • total = unitPriceTtc × units × nights, rounded scale-3 HALF_UP
  • tva back-computation (HT from TTC) matches Money policy

AccommodationBookingIT (Testcontainers Postgres — real persistence)
  • guest books dune-suite ×1, 1 night → reservation.totalAmount == suite price,
    NOT passengerAdultPrice × partySize
  • a manipulated client "price"/"total" field is ignored — only units count
  • units × capacity < partySize            → 422 (not enough beds)
  • accommodation with no price              → 422, no reservation created,
    no Keycloak/side effects
  • booking WITHOUT accommodationSlug (bivouac) → unchanged legacy per-person total
  • SNAPSHOT STABILITY: create booking → change the AccommodationType price in
    the catalogue → the reservation's stored total is unchanged
  • the invoice generated from the reservation uses the SNAPSHOT unit price,
    not the current catalogue price
  • PublicStayResponse.accommodations excludes the unpriced/inactive rows

MoneyTest (unit)
  • scale 3, HALF_UP, both directions; TTC↔HT round-trips within tolerance
```

## What is implemented now vs. blocked

Implemented (no real price invented): the entity, migration, pricing-resolution
service with fail-closed validation, snapshot on the reservation line, invoice
line handling, public exposure filtered to priced rows, admin CRUD, and the full
test suite — all exercised with **test-only** prices.

Blocked on **F-1 + F-2**: activating production prices. Until an admin enters
real `unit_price_ttc` values, every accommodation is vitrine-invisible and any
booking that names one is rejected with "pricing not configured". `nuitee-bivouac`
is unaffected and keeps working.
