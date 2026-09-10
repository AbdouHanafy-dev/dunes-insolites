# Phase 2 — Availability, expiring holds & concurrency safety

## AVAILABILITY MODEL

```
capacity per unit   AccommodationType.capacity — guests ONE unit sleeps
                    (tent 2, room 3, suite 4). Used to size a booking
                    (units × capacity ≥ party).

physical units      AccommodationType.max_units — how many units of the tier
                    exist. NULLABLE. NULL = not configured → availability
                    reports UNKNOWN and NO ceiling is enforced (same as
                    pre-Phase-2). No production number is invented.

consuming statuses  A reservation line consumes accommodation units when:
                      • status = CONFIRMED or CHECKED_IN, OR
                      • status = PENDING AND (hold_expires_at IS NULL OR > now)
                    Non-consuming: EXPIRED, CANCELLED, REJECTED, COMPLETED,
                    and any PENDING hold past its expiry.

date interval       check-in INCLUSIVE, check-out EXCLUSIVE. Two stays overlap
                    when  existing.checkIn < requested.checkOut
                     AND  existing.checkOut > requested.checkIn.
                    Adjacent stays (one's check-out == the other's check-in)
                    do NOT overlap.

hold expiration     A public guest booking creates a PENDING reservation with
                    hold_expires_at = now + app.reservation.hold-duration-minutes
                    (default 4320 = 72h — BUSINESS DECISION F-3). HoldExpiryJob
                    (@Scheduled, every 5 min) flips past-expiry PENDING holds to
                    EXPIRED. Availability already treats them as non-consuming,
                    so the job is housekeeping, not correctness. Confirming a
                    hold clears hold_expires_at.
```

## CONCURRENCY STRATEGY — why two requests cannot both take the last unit

```
Booking runs inside ReservationServiceImpl.createReservation's @Transactional.
For each accommodation-priced stay line, before the reservation is saved:

  1. accommodationTypeRepository.lockById(id)   → SELECT ... FOR UPDATE
     on that one tier row.
  2. reservationTourTypeRepository.sumConsumingUnits(id, checkIn, checkOut, now)
  3. if sum + requestedUnits > max_units → throw AccommodationUnavailableException
     (409) → the whole transaction rolls back, no reservation is created.

The FOR UPDATE lock is held until the transaction commits (after the reservation
is INSERTed). So:

  Thread A: BEGIN → lock tier row → count = 0 → ok → INSERT reservation → COMMIT
  Thread B: BEGIN → lock tier row  ── BLOCKS on A's lock ──
            (A commits, releasing the lock, with 1 unit now consuming)
            → count = 1 → 1 + 1 > 1 → throw → ROLLBACK

The check and the insert are inside the same lock, so there is no
time-of-check-to-time-of-use gap. `AccommodationConcurrencyIT` proves this: two
threads at a CyclicBarrier, maxUnits=1, ×8 repetitions — exactly one 2xx, one
409, DB shows exactly 1 unit, every time.

Different tiers lock different rows → independent inventory, no contention.
The public availability GET takes NO lock (advisory, may be stale); the booking
POST always re-checks under the lock (STEP 12).
```

## PHASE 1 REGRESSION — admin updates preserve the accommodation snapshot

```
ReservationServiceImpl.updateReservation's HEBERGEMENT branch rebuilds the
ReservationTourType lines. It now:

  • captures the prior accommodation snapshot(s) keyed by catalogTourTypeId
    BEFORE clearing the lines;
  • if the update request carries an explicit accommodationTypeId → reprice
    (deliberate re-selection);
  • otherwise → copy the prior snapshot's 5 fields onto the rebuilt line
    verbatim. NO catalogue price is re-read.

So editing an unrelated field, or the admin form round-tripping the tourTypes
array, leaves an accommodation-priced reservation's total unchanged. A later
catalogue price change also does not move it. Three IT cases in
AccommodationBookingIT prove this.
```

## DATABASE (V4__accommodation_availability.sql)

```
ADD  accommodation_types.max_units  integer NULL
     + CHECK (max_units IS NULL OR max_units >= 0)
ADD  reservations.hold_expires_at   timestamp(6) NULL
ALTER reservations_status_check → add 'EXPIRED'
INDEX reservation_tour_types (accommodation_type_id) WHERE NOT NULL   -- the SUM query
INDEX reservations (status, check_in_date)                            -- consuming-units + sweep
INDEX reservations (hold_expires_at) WHERE status='PENDING' AND hold_expires_at IS NOT NULL  -- sweep
```

Strictly additive. Existing rows: max_units NULL, hold_expires_at NULL, no
status change → identical behaviour. ddl-auto:validate passes.

## BUSINESS DECISIONS REQUIRED

```
F-3  Hold duration. Default 4320 min (72h). Confirm the real window a guest's
     unpaid hold should reserve inventory before release.
F-2b Per-tier max_units — the real number of Desert Tents / Rooms / Suites.
     NOT invented. Until set, each tier's availability is UNKNOWN and no
     ceiling is enforced (bookings behave exactly as pre-Phase-2).
```
