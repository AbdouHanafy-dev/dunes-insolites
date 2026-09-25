-- A circuit's duration is now a whole number of hours instead of free text
-- ("3 Jours / 2 Nuits"). Days and nights are derived from it for display.
--
-- Existing text is converted: "N jour(s)/day(s)" -> N * 24 h, "N h/heure(s)/hour(s)"
-- -> N h. "3 Jours / 2 Nuits" therefore becomes 72 h. Anything that cannot be
-- read stays NULL for an editor to fill in. The old `duration` column is kept
-- (unmapped) so older dumps and rollbacks still load.
ALTER TABLE tours ADD COLUMN duration_hours INTEGER;

UPDATE tours
SET duration_hours = CASE
    WHEN duration ~* '[0-9]+[[:space:]]*(jour|day)'
        THEN (substring(duration FROM '([0-9]+)[[:space:]]*(?:[jJ]our|[dD]ay)'))::int * 24
    WHEN duration ~* '[0-9]+[[:space:]]*(h|heure|hour)'
        THEN (substring(duration FROM '([0-9]+)[[:space:]]*(?:[hH])'))::int
    END
WHERE duration IS NOT NULL;

ALTER TABLE tours
    ADD CONSTRAINT tours_duration_hours_check
        CHECK (duration_hours IS NULL OR duration_hours BETWEEN 1 AND 720);
