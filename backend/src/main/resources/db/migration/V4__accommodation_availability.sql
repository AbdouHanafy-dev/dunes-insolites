-- V4__accommodation_availability.sql
-- Production-hardening Phase 2: truthful, concurrency-safe accommodation availability.
--
-- Strictly additive. Existing rows get NULL max_units / NULL hold_expires_at
-- and no status change, so behaviour is unchanged until an admin configures
-- max_units. See docs/reports/phase2-availability.md.

-- Physical unit inventory per tier. NULL = not configured => availability
-- reports UNKNOWN and no ceiling is enforced. NO production number is seeded.
ALTER TABLE accommodation_types
    ADD COLUMN max_units integer;

ALTER TABLE accommodation_types
    ADD CONSTRAINT accommodation_types_max_units_check
        CHECK (max_units IS NULL OR max_units >= 0);

-- Public guest hold expiry. NULL = never expires (staff / legacy PENDING,
-- and every confirmed reservation).
ALTER TABLE reservations
    ADD COLUMN hold_expires_at timestamp(6) without time zone;

-- Widen the reservation status check for EXPIRED.
ALTER TABLE reservations
    DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations
    ADD CONSTRAINT reservations_status_check
        CHECK (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED',
                          'REJECTED', 'COMPLETED', 'EXPIRED'));

-- The capacity query sums accommodation_units per tier over a date range.
CREATE INDEX reservation_tour_types_accommodation_type_idx
    ON reservation_tour_types (accommodation_type_id)
    WHERE accommodation_type_id IS NOT NULL;

-- Reservation lookups by status + date: the consuming-units query and the
-- hold-expiry sweep.
CREATE INDEX reservations_status_checkin_idx
    ON reservations (status, check_in_date);

CREATE INDEX reservations_hold_expiry_idx
    ON reservations (hold_expires_at)
    WHERE status = 'PENDING' AND hold_expires_at IS NOT NULL;
