-- Consolidate guide/transport/pickup into Extra, ReservationExtra and the
-- existing accommodation pricing-rule table. V16 data is retained.
ALTER TABLE extras ADD COLUMN category varchar(20) NOT NULL DEFAULT 'ACTIVITY';
ALTER TABLE extras ADD COLUMN service_type varchar(100);
ALTER TABLE extras ADD COLUMN pricing_unit varchar(20) NOT NULL DEFAULT 'PER_UNIT';
ALTER TABLE extras ADD COLUMN requires_customer_vehicle boolean NOT NULL DEFAULT false;
ALTER TABLE extras ADD COLUMN display_order integer NOT NULL DEFAULT 0;

CREATE TABLE extra_pickup_fields (
    extra_id uuid NOT NULL REFERENCES extras(extra_id) ON DELETE CASCADE,
    field_name varchar(30) NOT NULL,
    PRIMARY KEY (extra_id, field_name)
);
CREATE TABLE extra_required_pickup_fields (
    extra_id uuid NOT NULL REFERENCES extras(extra_id) ON DELETE CASCADE,
    field_name varchar(30) NOT NULL,
    PRIMARY KEY (extra_id, field_name)
);
CREATE TABLE extra_resource_requirements (
    id uuid NOT NULL PRIMARY KEY,
    extra_id uuid NOT NULL REFERENCES extras(extra_id) ON DELETE CASCADE,
    resource_extra_id uuid NOT NULL REFERENCES extras(extra_id),
    quantity integer NOT NULL CHECK (quantity > 0),
    UNIQUE (extra_id, resource_extra_id),
    CHECK (extra_id <> resource_extra_id)
);

ALTER TABLE accommodation_pricing_rules ADD COLUMN extra_id uuid REFERENCES extras(extra_id);
ALTER TABLE accommodation_pricing_rules ALTER COLUMN accommodation_type_id DROP NOT NULL;
ALTER TABLE accommodation_pricing_rules ADD CONSTRAINT pricing_rule_single_target_check
    CHECK ((accommodation_type_id IS NOT NULL) <> (extra_id IS NOT NULL));
CREATE INDEX idx_extra_pricing_rules_lookup
    ON accommodation_pricing_rules (extra_id, start_date, end_date) WHERE active = true;

ALTER TABLE reservation_extras ADD COLUMN category varchar(20) NOT NULL DEFAULT 'ACTIVITY';
ALTER TABLE reservation_extras ADD COLUMN service_type varchar(100);
ALTER TABLE reservation_extras ADD COLUMN pricing_unit varchar(20) NOT NULL DEFAULT 'PER_UNIT';
ALTER TABLE reservation_extras ADD COLUMN pickup_hotel_name varchar(255);
ALTER TABLE reservation_extras ADD COLUMN pickup_airport varchar(255);
ALTER TABLE reservation_extras ADD COLUMN pickup_flight_number varchar(255);
ALTER TABLE reservation_extras ADD COLUMN pickup_address text;
ALTER TABLE reservation_extras ADD COLUMN pickup_arrival_time varchar(255);
ALTER TABLE reservation_extras ADD COLUMN pickup_instructions text;
ALTER TABLE reservation_extras ADD COLUMN is_resource_allocation boolean NOT NULL DEFAULT false;
ALTER TABLE reservation_extras ADD COLUMN selected_extra_id uuid;

INSERT INTO extras (extra_id, name, slug, description, unit_price, is_active,
                    max_units_per_day, tva, category, service_type, pricing_unit,
                    requires_customer_vehicle, display_order, review_count)
SELECT id, name, slug, description, COALESCE(unit_price_ttc, 0),
       active AND unit_price_ttc IS NOT NULL, max_units_per_day, tva_rate,
       category, type, pricing_unit, requires_customer_vehicle, display_order, 0
FROM service_options
ON CONFLICT (slug) DO NOTHING;

INSERT INTO extra_pickup_fields (extra_id, field_name)
SELECT so.id, f.field_name
FROM service_options so
CROSS JOIN LATERAL (
    SELECT unnest(CASE
        WHEN so.type LIKE '%HOTEL%' THEN ARRAY['HOTEL_NAME','ADDRESS','INSTRUCTIONS']
        WHEN so.type LIKE '%AIRPORT%' THEN ARRAY['AIRPORT','FLIGHT_NUMBER','ARRIVAL_TIME','INSTRUCTIONS']
        ELSE ARRAY['ADDRESS','INSTRUCTIONS'] END)
) AS f(field_name)
WHERE so.requires_pickup_location
  AND EXISTS (SELECT 1 FROM extras e WHERE e.extra_id = so.id)
ON CONFLICT DO NOTHING;

INSERT INTO extra_required_pickup_fields (extra_id, field_name)
SELECT id, CASE
    WHEN type LIKE '%HOTEL%' THEN 'HOTEL_NAME'
    WHEN type LIKE '%AIRPORT%' THEN 'AIRPORT'
    ELSE 'ADDRESS' END
FROM service_options
WHERE requires_pickup_location
  AND EXISTS (SELECT 1 FROM extras e WHERE e.extra_id = service_options.id)
ON CONFLICT DO NOTHING;

INSERT INTO accommodation_pricing_rules
    (id, accommodation_type_id, extra_id, rule_type, start_date, end_date,
     price_ttc, active, created_at, updated_at)
SELECT r.id, NULL, r.service_option_id, r.rule_type, r.start_date, r.end_date,
       r.price_ttc, r.active, r.created_at, r.updated_at
FROM service_option_pricing_rules r
WHERE EXISTS (SELECT 1 FROM extras e WHERE e.extra_id = r.service_option_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservation_extras
    (reservation_extra_id, reservation_id, catalog_extra_id, selected_extra_id, name, description,
     quantity, unit_price, total_price, is_active, activity_date, tva,
     category, service_type, pricing_unit, pickup_hotel_name, pickup_airport,
     pickup_flight_number, pickup_address, pickup_arrival_time, pickup_instructions,
     is_resource_allocation)
SELECT reservation_service_option_id, reservation_id, NULL, catalog_service_option_id,
       name, description, quantity, unit_price, total_price, is_active, service_date,
       tva, category, type, pricing_unit, pickup_hotel_name, pickup_airport,
       pickup_flight_number, pickup_address, pickup_arrival_time, pickup_instructions, false
FROM reservation_service_options
ON CONFLICT (reservation_extra_id) DO NOTHING;

-- Historical option rows also become zero-price inventory allocations. This
-- keeps capacity accounting correct after the legacy tables are removed.
INSERT INTO reservation_extras
    (reservation_extra_id, reservation_id, catalog_extra_id, selected_extra_id,
     name, description, quantity, unit_price, total_price, is_active,
     activity_date, tva, category, service_type, pricing_unit,
     is_resource_allocation)
SELECT gen_random_uuid(), reservation_id, catalog_service_option_id,
       catalog_service_option_id, name, description, quantity, 0, 0, is_active,
       service_date, 0, category, type, pricing_unit, true
FROM reservation_service_options
WHERE catalog_service_option_id IS NOT NULL;

DROP TABLE reservation_service_options;
DROP TABLE service_option_pricing_rules;
DROP TABLE service_options;
