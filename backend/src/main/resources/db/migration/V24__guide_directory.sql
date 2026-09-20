-- Permanent guide directory. `guides` remains the per-reservation snapshot
-- so historical bookings retain the exact guide details used at the time.
CREATE TABLE guide_profiles (
    guide_profile_id uuid NOT NULL PRIMARY KEY,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255),
    phone_number character varying(255),
    active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_guide_profiles_email
    ON guide_profiles (LOWER(email))
    WHERE email IS NOT NULL;

CREATE TABLE guide_profile_languages (
    guide_profile_id uuid NOT NULL REFERENCES guide_profiles(guide_profile_id) ON DELETE CASCADE,
    language_id uuid NOT NULL REFERENCES spoken_languages(language_id),
    PRIMARY KEY (guide_profile_id, language_id)
);

ALTER TABLE guides
    ADD COLUMN guide_profile_id uuid REFERENCES guide_profiles(guide_profile_id);
CREATE INDEX idx_guides_guide_profile ON guides (guide_profile_id);
