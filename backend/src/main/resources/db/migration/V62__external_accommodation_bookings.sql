-- Manual accommodation inventory consumed by sales made outside this website
-- (GetYourGuide, Booking.com, telephone, etc.). A row represents physical
-- units occupied for every night in [check_in, check_out).
CREATE TABLE external_accommodation_bookings (
    id uuid PRIMARY KEY,
    accommodation_type_id uuid NOT NULL
        REFERENCES accommodation_types(id),
    check_in date NOT NULL,
    check_out date NOT NULL,
    units integer NOT NULL,
    source varchar(40) NOT NULL,
    external_reference varchar(120),
    note varchar(500),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT external_accommodation_booking_dates_check CHECK (check_out > check_in),
    CONSTRAINT external_accommodation_booking_units_check CHECK (units > 0),
    CONSTRAINT external_accommodation_booking_source_check CHECK (
        source IN ('GETYOURGUIDE', 'BOOKING_COM', 'EXPEDIA', 'PHONE', 'WALK_IN', 'OTHER')
    )
);

CREATE INDEX external_accommodation_bookings_tier_dates_idx
    ON external_accommodation_bookings (accommodation_type_id, check_in, check_out);
