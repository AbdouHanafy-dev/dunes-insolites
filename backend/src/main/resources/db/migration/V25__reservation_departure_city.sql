ALTER TABLE reservations
    ADD COLUMN departure_city VARCHAR(20);

ALTER TABLE reservations
    ADD CONSTRAINT reservations_departure_city_check
        CHECK (departure_city IS NULL OR departure_city IN
            ('TUNIS', 'SOUSSE', 'HAMMAMET', 'DJERBA', 'MAHDIA', 'MONASTIR'));

COMMENT ON COLUMN reservations.departure_city IS
    'Where the guest departs from for pickup, on a TOURS or HEBERGEMENT reservation. Null for EXTRAS.';
