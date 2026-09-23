-- Existing multi-day circuits predate the explicit overnight flag. They all
-- route through the Sabria camp, so enable the accommodation step for them.
-- One-day excursions remain unchanged.
UPDATE tours
SET overnights_at_camp = true
WHERE duration ~* '([2-9]|[1-9][0-9]+)[[:space:]]*(jour|day)';
