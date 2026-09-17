-- Date/period price overrides for an accommodation tier (Desert Tent/Room/
-- Dune Suite) - the "15/10/2026 -> 300 TND" and "01/10 -> 31/10 -> 230 TND"
-- cases from the pricing brief. Resolved in AccommodationPricingService:
-- a DATE rule covering the requested date wins over a PERIOD rule, which
-- wins over the tier's own unit_price_ttc. No rows yet - nothing invented,
-- an admin creates real rules from the backoffice.
CREATE TABLE accommodation_pricing_rules (
    id uuid NOT NULL PRIMARY KEY,
    accommodation_type_id uuid NOT NULL REFERENCES accommodation_types(id),
    rule_type character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    price_ttc numeric(15,3) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT accommodation_pricing_rules_rule_type_check
        CHECK (rule_type IN ('DATE', 'PERIOD')),
    CONSTRAINT accommodation_pricing_rules_date_range_check
        CHECK (end_date >= start_date)
);

CREATE INDEX idx_accommodation_pricing_rules_lookup
    ON accommodation_pricing_rules (accommodation_type_id, start_date, end_date)
    WHERE active = true;
