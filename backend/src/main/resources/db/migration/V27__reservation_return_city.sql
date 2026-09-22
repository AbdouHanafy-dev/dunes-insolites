ALTER TABLE reservations
    ADD COLUMN return_city VARCHAR(20);

ALTER TABLE reservations
    ADD CONSTRAINT reservations_return_city_check
        CHECK (return_city IS NULL OR return_city IN
            ('TUNIS', 'SOUSSE', 'HAMMAMET', 'DJERBA', 'MAHDIA', 'MONASTIR'));

COMMENT ON COLUMN reservations.return_city IS
    'Optional return leg after the stay/tour ends - same city catalog as departure_city, reused rather than a second enum. Null when the guest skips it; staff arrange the driver later.';
