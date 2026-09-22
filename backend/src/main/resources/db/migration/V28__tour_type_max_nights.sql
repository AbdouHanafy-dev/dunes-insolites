ALTER TABLE tour_types
    ADD COLUMN max_nights INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tour_types
    ADD CONSTRAINT tour_types_max_nights_check CHECK (max_nights >= 1);

COMMENT ON COLUMN tour_types.max_nights IS
    'Maximum nights bookable in one reservation for this nuitée. 1 (default) = fixed single-night stay, the booking flow only asks for an arrival date. Greater than 1 = the guest picks an arrival+departure range, capped at this many nights.';
