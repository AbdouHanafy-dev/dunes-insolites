-- Permanent chauffeur directory. `chauffeurs` remains the immutable-ish
-- per-reservation assignment/snapshot table so historical bookings keep the
-- name and vehicle that were actually assigned at that time.
CREATE TABLE driver_profiles (
    driver_profile_id uuid NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES users(user_id),
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    phone_number character varying(255),
    vehicle_model character varying(255),
    number_of_seats integer,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT driver_profiles_seats_positive CHECK (number_of_seats IS NULL OR number_of_seats > 0)
);

ALTER TABLE chauffeurs
    ADD COLUMN driver_profile_id uuid REFERENCES driver_profiles(driver_profile_id);
CREATE INDEX idx_chauffeurs_driver_profile ON chauffeurs (driver_profile_id);

-- Preserve existing linked chauffeur accounts by creating one reusable
-- profile per account from its latest assignment.
INSERT INTO driver_profiles (
    driver_profile_id, user_id, first_name, last_name, phone_number,
    vehicle_model, number_of_seats, active
)
SELECT DISTINCT ON (c.driver_user_id)
    gen_random_uuid(), c.driver_user_id, c.first_name, c.last_name,
    c.phone_number, c.vehicle_model, c.number_of_seats, true
FROM chauffeurs c
JOIN users u ON u.user_id = c.driver_user_id AND u.role = 'CHAUFFEUR'
JOIN reservations r ON r.reservation_id = c.reservation_id
WHERE c.driver_user_id IS NOT NULL
ORDER BY c.driver_user_id, r.service_date DESC NULLS LAST, c.chauffeur_id;

UPDATE chauffeurs c
SET driver_profile_id = dp.driver_profile_id
FROM driver_profiles dp
WHERE c.driver_user_id = dp.user_id;
