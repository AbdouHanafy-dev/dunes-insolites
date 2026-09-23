-- Which nuitée is THE Sabria camp that multi-day circuits sleep at. Circuits
-- read their Tent/Room/Suite tiers from this one stay, independently of
-- has_accommodation_types (which only controls the stay's own booking form).
-- At most one row may be true; the back office moves the flag, never doubles it.
ALTER TABLE tour_types
    ADD COLUMN circuit_camp boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX tour_types_single_circuit_camp_idx
    ON tour_types (circuit_camp) WHERE circuit_camp;

-- Backfill: the legacy camp slug, else the only stay that owns tiers.
UPDATE tour_types SET circuit_camp = true WHERE slug = 'nuitee-campement-desert';

UPDATE tour_types SET circuit_camp = true
WHERE NOT EXISTS (SELECT 1 FROM tour_types WHERE circuit_camp)
  AND tour_type_id IN (SELECT tour_type_id FROM accommodation_types)
  AND (SELECT count(DISTINCT tour_type_id) FROM accommodation_types) = 1;
