-- Capacity overrides by exact date or inclusive period. Exactly one target is
-- set: an accommodation tier or an activity extra. max_units = 0 closes it.
CREATE TABLE inventory_rules (
    id uuid PRIMARY KEY,
    accommodation_type_id uuid REFERENCES accommodation_types(id),
    extra_id uuid REFERENCES extras(extra_id),
    rule_type varchar(20) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    max_units integer NOT NULL,
    note varchar(500),
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT inventory_rule_single_target_check CHECK (
        (accommodation_type_id IS NOT NULL AND extra_id IS NULL)
        OR (accommodation_type_id IS NULL AND extra_id IS NOT NULL)
    ),
    CONSTRAINT inventory_rule_dates_check CHECK (end_date >= start_date),
    CONSTRAINT inventory_rule_units_check CHECK (max_units >= 0),
    CONSTRAINT inventory_rule_type_check CHECK (rule_type IN ('DATE', 'PERIOD'))
);

CREATE INDEX inventory_rules_accommodation_dates_idx
    ON inventory_rules (accommodation_type_id, start_date, end_date);
CREATE INDEX inventory_rules_extra_dates_idx
    ON inventory_rules (extra_id, start_date, end_date);
