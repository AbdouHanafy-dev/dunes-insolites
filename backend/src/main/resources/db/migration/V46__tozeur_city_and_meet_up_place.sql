-- TOZEUR joins the pickup / drop-off city catalog.
ALTER TABLE reservations DROP CONSTRAINT reservations_departure_city_check;
ALTER TABLE reservations
    ADD CONSTRAINT reservations_departure_city_check
        CHECK (departure_city IS NULL OR departure_city IN
            ('TUNIS', 'SOUSSE', 'HAMMAMET', 'DJERBA', 'MAHDIA', 'MONASTIR', 'TOZEUR'));

ALTER TABLE reservations DROP CONSTRAINT reservations_return_city_check;
ALTER TABLE reservations
    ADD CONSTRAINT reservations_return_city_check
        CHECK (return_city IS NULL OR return_city IN
            ('TUNIS', 'SOUSSE', 'HAMMAMET', 'DJERBA', 'MAHDIA', 'MONASTIR', 'TOZEUR'));

-- Free-text meeting place written by the support team once the reservation
-- is set, so they can organise the pickup for the departure city.
ALTER TABLE reservations
    ADD COLUMN meet_up_place VARCHAR(255);

COMMENT ON COLUMN reservations.meet_up_place IS
    'Staff-only: where the guest is met at the departure city. Never returned to non-staff callers.';
