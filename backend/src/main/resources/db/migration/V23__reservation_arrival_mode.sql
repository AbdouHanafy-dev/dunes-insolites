ALTER TABLE reservations
    ADD COLUMN arrival_mode VARCHAR(20);

ALTER TABLE reservations
    ADD CONSTRAINT reservations_arrival_mode_check
        CHECK (arrival_mode IS NULL OR arrival_mode IN ('OWN_VEHICLE', 'TRANSPORT'));

COMMENT ON COLUMN reservations.arrival_mode IS
    'Client arrival choice: own vehicle or transport requested for later staff assignment.';
