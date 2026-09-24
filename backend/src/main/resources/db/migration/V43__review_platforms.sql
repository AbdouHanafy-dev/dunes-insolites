-- V43__review_platforms.sql
-- Review platforms become data instead of a fixed enum: support staff can
-- add a platform that isn't listed (a name and a colour) and every platform
-- keeps its own colour on the site. The six platforms V42 knew about are
-- seeded; `source_key` keeps the machine key the public wire type already
-- uses for them (google, tripadvisor, ...) and is NULL for platforms added
-- later, which the public API reports as "other".
CREATE TABLE review_platforms (
    platform_id uuid NOT NULL,
    name character varying(80) NOT NULL,
    color character varying(7) NOT NULL,
    source_key character varying(30),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT review_platforms_pkey PRIMARY KEY (platform_id),
    CONSTRAINT review_platforms_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX ux_review_platforms_name ON review_platforms (lower(name));

INSERT INTO review_platforms (platform_id, name, color, source_key, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Google',       '#4285F4', 'google',       now(), now()),
    (gen_random_uuid(), 'TripAdvisor',  '#34E0A1', 'tripadvisor',  now(), now()),
    (gen_random_uuid(), 'Booking.com',  '#003580', 'booking',      now(), now()),
    (gen_random_uuid(), 'Airbnb',       '#FF385C', 'airbnb',       now(), now()),
    (gen_random_uuid(), 'GetYourGuide', '#FF5533', 'getyourguide', now(), now()),
    (gen_random_uuid(), 'WeTravel',     '#0F8B8D', 'wetravel',     now(), now());

ALTER TABLE external_reviews ADD COLUMN platform_id uuid;

UPDATE external_reviews e
   SET platform_id = p.platform_id
  FROM review_platforms p
 WHERE upper(p.source_key) = e.source;

ALTER TABLE external_reviews ALTER COLUMN platform_id SET NOT NULL;
ALTER TABLE external_reviews
    ADD CONSTRAINT fk_external_reviews_platform
    FOREIGN KEY (platform_id) REFERENCES review_platforms (platform_id);
CREATE INDEX ix_external_reviews_platform ON external_reviews (platform_id);

ALTER TABLE external_reviews DROP CONSTRAINT external_reviews_source_check;
ALTER TABLE external_reviews DROP COLUMN source;
