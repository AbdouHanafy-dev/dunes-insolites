-- Sample/catalogue data is created once, not on every start.
--
-- Seed used to re-create anything missing at each startup ("no gallery photo left"
-- -> re-add the five sample photos; "no tour with this name" -> re-add the circuit),
-- so content an editor had deleted in the backoffice came back on every deploy.
-- Each block now runs once and records itself here.
CREATE TABLE seed_markers (
    marker_key VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT now()
);

-- A database that already has accounts is a live one: its content is whatever the
-- editors left, so every block counts as done and nothing is re-created. A fresh
-- database (no accounts yet) gets the blocks on its first start.
INSERT INTO seed_markers (marker_key)
SELECT k
FROM unnest(ARRAY[
    'catalog-sources', 'catalog-tour-types', 'catalog-tours', 'catalog-extras',
    'catalog-camp-activities', 'catalog-gallery', 'catalog-circuits-nav',
    'sample-guides', 'sample-drivers', 'sample-content-blocks', 'sample-newsletter'
]) AS k
WHERE EXISTS (SELECT 1 FROM users);
