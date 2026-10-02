-- Lets an accommodation tier (Desert Tent / Desert Room / Dune Suite) be translated: its name,
-- description and feature list. Until now the tier cards on the camp and circuit pages showed
-- these in French whatever the visitor's language.
--
-- Additive only: two new tables, nothing existing is altered, moved or deleted. The tier's own
-- name/description/features columns stay the French original and the fallback for any field a
-- translation leaves empty. IF NOT EXISTS keeps a re-run harmless.
CREATE TABLE IF NOT EXISTS accommodation_type_translations (
    accommodation_type_translation_id uuid NOT NULL PRIMARY KEY,
    accommodation_type_id uuid NOT NULL REFERENCES accommodation_types(id),
    locale varchar(255) NOT NULL CHECK (locale IN ('EN', 'DE', 'IT', 'DA', 'AR')),
    name varchar(255),
    description text,
    UNIQUE (accommodation_type_id, locale)
);

CREATE TABLE IF NOT EXISTS accommodation_type_translation_features (
    accommodation_type_translation_id uuid NOT NULL REFERENCES accommodation_type_translations(accommodation_type_translation_id),
    feature text,
    display_order integer NOT NULL,
    PRIMARY KEY (accommodation_type_translation_id, display_order)
);
