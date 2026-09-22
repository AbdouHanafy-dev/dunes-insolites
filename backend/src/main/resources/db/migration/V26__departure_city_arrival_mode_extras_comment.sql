-- 21 Sep 2026: standalone EXTRAS bookings placed via /book (not an on-site
-- guest already at the camp) can now also need pickup/transport, same as a
-- day circuit. The CHECK constraints on arrival_mode (V23) and
-- departure_city (V25) already allow this for any reservation type; only
-- the column comments described the old EXTRAS-excluded assumption.
COMMENT ON COLUMN reservations.departure_city IS
    'Where the guest departs from for pickup, on a TOURS, HEBERGEMENT, or standalone EXTRAS (/book) reservation.';

COMMENT ON COLUMN reservations.arrival_mode IS
    'Client arrival choice: own vehicle or transport requested for later staff assignment. Applies to TOURS, HEBERGEMENT, and standalone EXTRAS (/book) reservations.';
