-- "Getting There & Guide" booking step: guide + transport/pickup add-ons
-- the guest picks and pays for, kept deliberately separate from `extras`
-- (activities) since pricing here can be per-day/per-booking/per-person/
-- per-vehicle, not just per-unit-per-day, and transport options carry
-- pickup-specific fields activities never need. No rows seeded - an
-- admin creates the real options and prices from the backoffice.

ALTER TABLE tour_types ADD COLUMN guide_required boolean NOT NULL DEFAULT false;

CREATE TABLE service_options (
    id uuid NOT NULL PRIMARY KEY,
    slug character varying(255) NOT NULL UNIQUE,
    name character varying(255) NOT NULL,
    description text,
    category character varying(20) NOT NULL,
    type character varying(100) NOT NULL,
    pricing_unit character varying(20) NOT NULL,
    unit_price_ttc numeric(15,3),
    tva_rate numeric(6,3) NOT NULL DEFAULT 0,
    max_units_per_day integer,
    requires_pickup_location boolean NOT NULL DEFAULT false,
    requires_customer_vehicle boolean NOT NULL DEFAULT false,
    display_order integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    CONSTRAINT service_options_category_check CHECK (category IN ('GUIDE', 'TRANSPORT')),
    CONSTRAINT service_options_pricing_unit_check
        CHECK (pricing_unit IN ('PER_DAY', 'PER_BOOKING', 'PER_PERSON', 'PER_VEHICLE'))
);

-- Twin of accommodation_pricing_rules, same shape, independent table -
-- see ServiceOptionPricingRule's own javadoc for why this isn't a
-- polymorphic generalization of PricingRule.
CREATE TABLE service_option_pricing_rules (
    id uuid NOT NULL PRIMARY KEY,
    service_option_id uuid NOT NULL REFERENCES service_options(id),
    rule_type character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    price_ttc numeric(15,3) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT service_option_pricing_rules_rule_type_check
        CHECK (rule_type IN ('DATE', 'PERIOD')),
    CONSTRAINT service_option_pricing_rules_date_range_check
        CHECK (end_date >= start_date)
);

CREATE INDEX idx_service_option_pricing_rules_lookup
    ON service_option_pricing_rules (service_option_id, start_date, end_date)
    WHERE active = true;

-- Twin of reservation_extras - one line per guide/transport option chosen,
-- fully snapshotted (name/price/pricing unit never re-read from the
-- catalogue after booking), plus the pickup fields only a TRANSPORT
-- option with requires_pickup_location fills in.
CREATE TABLE reservation_service_options (
    reservation_service_option_id uuid NOT NULL PRIMARY KEY,
    reservation_id uuid NOT NULL REFERENCES reservations(reservation_id),
    catalog_service_option_id uuid,
    name character varying(255) NOT NULL,
    description text,
    category character varying(20) NOT NULL,
    type character varying(100) NOT NULL,
    pricing_unit character varying(20) NOT NULL,
    unit_price numeric(15,3) NOT NULL,
    quantity integer NOT NULL,
    total_price numeric(15,3) NOT NULL,
    tva numeric(6,3) NOT NULL DEFAULT 0,
    service_date date,
    pickup_hotel_name character varying(255),
    pickup_airport character varying(255),
    pickup_flight_number character varying(255),
    pickup_address text,
    pickup_arrival_time character varying(255),
    pickup_instructions text,
    is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_reservation_service_options_reservation
    ON reservation_service_options (reservation_id);

-- SERVICE_OPTIONS joins the delegable-resource permission matrix
-- (AdminResource.SERVICE_OPTIONS). Both CHECK constraints enumerate the
-- allowed values by hand and have to be widened - same as GALLERY (V8)
-- and NEWSLETTER_SUBSCRIBERS (V9).
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_resource_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_resource_check
    CHECK ((resource)::text = ANY ((ARRAY[
        'USERS','RESERVATIONS','INVOICES','TRANSACTIONS','TOURS','TOUR_TYPES',
        'EXTRAS','REVIEWS','AVAILABILITY','PAGES','CONTENT_BLOCKS','MEDIA',
        'NAVIGATION','REDIRECTS','GALLERY','MAINTENANCE_WINDOWS',
        'NEWSLETTER_SUBSCRIBERS','SERVICE_OPTIONS'
    ]::character varying[])::text[]));

ALTER TABLE custom_role_permissions DROP CONSTRAINT custom_role_permissions_resource_check;
ALTER TABLE custom_role_permissions ADD CONSTRAINT custom_role_permissions_resource_check
    CHECK ((resource)::text = ANY ((ARRAY[
        'USERS','RESERVATIONS','INVOICES','TRANSACTIONS','TOURS','TOUR_TYPES',
        'EXTRAS','REVIEWS','AVAILABILITY','PAGES','CONTENT_BLOCKS','MEDIA',
        'NAVIGATION','REDIRECTS','GALLERY','MAINTENANCE_WINDOWS',
        'NEWSLETTER_SUBSCRIBERS','SERVICE_OPTIONS'
    ]::character varying[])::text[]));
