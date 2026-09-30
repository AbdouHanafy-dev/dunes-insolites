-- Air conditioning and bathroom type actually differ per accommodation tier
-- (the PDF spec sheets: Tente Authentique/Tente Chambre share bathrooms and
-- have no AC, Suite Luxe / Tente Royale has a private bathroom and evening/
-- night AC) - everything else on the detail page (Wi-Fi, meal plan,
-- electricity, camp-wide experience) is identical across tiers and stays in
-- code. An admin can now flip these two per tier instead of asking for a
-- code change every time the camp's real equipment changes.
ALTER TABLE accommodation_types
    ADD COLUMN air_conditioned boolean NOT NULL DEFAULT false,
    ADD COLUMN private_bathroom boolean NOT NULL DEFAULT false;

-- Backfill the known real tiers from the current spec sheets so existing
-- rows aren't silently wrong the moment this ships.
UPDATE accommodation_types SET private_bathroom = true, air_conditioned = true WHERE slug = 'dune-suite';
