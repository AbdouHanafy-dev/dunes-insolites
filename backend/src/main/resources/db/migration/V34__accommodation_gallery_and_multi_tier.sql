-- Gallery photos for an accommodation tier's own detail page, same shape as
-- accommodation_type_features.
CREATE TABLE accommodation_type_gallery (
    accommodation_type_id uuid NOT NULL,
    photo_url             text,
    display_order         integer NOT NULL,
    CONSTRAINT accommodation_type_gallery_pkey PRIMARY KEY (accommodation_type_id, display_order),
    CONSTRAINT accommodation_type_gallery_fk
        FOREIGN KEY (accommodation_type_id) REFERENCES accommodation_types(id) ON DELETE CASCADE
);

-- A reservation's stay line can now carry several accommodation tiers at
-- once (e.g. 2 Suites + 3 Tentes in one booking), so the single-tier
-- snapshot columns on reservation_tour_types move into their own child
-- table, one row per tier.
CREATE TABLE reservation_accommodations (
    id                          uuid NOT NULL PRIMARY KEY,
    reservation_tour_type_id    uuid NOT NULL,
    accommodation_type_id       uuid,
    accommodation_name          varchar(255),
    accommodation_units         integer,
    accommodation_unit_price_ttc numeric(15,3),
    accommodation_tva_rate      numeric(6,3),
    CONSTRAINT reservation_accommodations_fk
        FOREIGN KEY (reservation_tour_type_id) REFERENCES reservation_tour_types(reservation_tour_type_id) ON DELETE CASCADE
);

CREATE INDEX reservation_accommodations_rtt_idx ON reservation_accommodations (reservation_tour_type_id);

-- Backfill: every existing single-tier snapshot becomes one child row.
INSERT INTO reservation_accommodations (
    id, reservation_tour_type_id, accommodation_type_id, accommodation_name,
    accommodation_units, accommodation_unit_price_ttc, accommodation_tva_rate
)
SELECT gen_random_uuid(), reservation_tour_type_id, accommodation_type_id, accommodation_name,
       accommodation_units, accommodation_unit_price_ttc, accommodation_tva_rate
FROM reservation_tour_types
WHERE accommodation_type_id IS NOT NULL;

ALTER TABLE reservation_tour_types
    DROP COLUMN accommodation_type_id,
    DROP COLUMN accommodation_name,
    DROP COLUMN accommodation_units,
    DROP COLUMN accommodation_unit_price_ttc,
    DROP COLUMN accommodation_tva_rate;
