-- V3__accommodation_types.sql
-- Production-hardening Phase 1: make accommodation a first-class priced product.
--
-- Strictly additive. Existing reservations keep NULL accommodation_* columns
-- and price per-person exactly as before. See
-- docs/reports/phase1-accommodation-pricing.md.

CREATE TABLE accommodation_types (
    id              uuid NOT NULL,
    tour_type_id    uuid NOT NULL,
    slug            varchar(255) NOT NULL,
    name            varchar(255) NOT NULL,
    description     text,
    image_url       varchar(255),
    capacity        integer NOT NULL,
    -- TTC, per unit per night. NULL = price not configured => not bookable.
    unit_price_ttc  numeric(15,3),
    tva_rate        numeric(6,3),
    currency        varchar(3) NOT NULL DEFAULT 'TND',
    display_order   integer NOT NULL DEFAULT 0,
    active          boolean NOT NULL DEFAULT true,
    CONSTRAINT accommodation_types_pkey PRIMARY KEY (id),
    CONSTRAINT accommodation_types_tour_type_slug_uk UNIQUE (tour_type_id, slug),
    CONSTRAINT accommodation_types_currency_check
        CHECK (currency IN ('TND', 'EUR', 'USD')),
    CONSTRAINT accommodation_types_tour_type_fk
        FOREIGN KEY (tour_type_id) REFERENCES tour_types(tour_type_id),
    CONSTRAINT accommodation_types_capacity_check CHECK (capacity >= 1),
    CONSTRAINT accommodation_types_price_check CHECK (unit_price_ttc IS NULL OR unit_price_ttc >= 0)
);

CREATE TABLE accommodation_type_features (
    accommodation_type_id uuid NOT NULL,
    feature               text,
    display_order         integer NOT NULL,
    CONSTRAINT accommodation_type_features_pkey PRIMARY KEY (accommodation_type_id, display_order),
    CONSTRAINT accommodation_type_features_fk
        FOREIGN KEY (accommodation_type_id) REFERENCES accommodation_types(id) ON DELETE CASCADE
);

CREATE INDEX accommodation_types_tour_type_idx ON accommodation_types (tour_type_id);

-- Accommodation snapshot on the stay line. All nullable — a per-person or
-- bivouac line leaves them empty.
ALTER TABLE reservation_tour_types
    ADD COLUMN accommodation_type_id         uuid,
    ADD COLUMN accommodation_name            varchar(255),
    ADD COLUMN accommodation_units           integer,
    ADD COLUMN accommodation_unit_price_ttc  numeric(15,3),
    ADD COLUMN accommodation_tva_rate        numeric(6,3);
