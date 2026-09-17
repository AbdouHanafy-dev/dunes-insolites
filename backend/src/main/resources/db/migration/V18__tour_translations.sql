-- Mirrors tour_type_translations / extra_translations exactly (see
-- TourTypeTranslation.java / ExtraTranslation.java) so Tour joins the same
-- CatalogTranslation system - the Tour wizard's "Traductions" step writes
-- here. Not yet consumed by the public site (see PublicCatalogTranslation
-- callers) - backend + admin scaffolding only, same status the same tables
-- already have for TourType/Extra.
CREATE TABLE tour_translations (
    tour_translation_id uuid NOT NULL PRIMARY KEY,
    tour_id uuid NOT NULL REFERENCES tours(tour_id),
    locale varchar(255) NOT NULL CHECK (locale IN ('EN', 'DE', 'IT', 'DA', 'AR')),
    name varchar(255),
    description text,
    about_text text,
    UNIQUE (tour_id, locale)
);

CREATE TABLE tour_translation_highlights (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    highlight text,
    display_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, display_order)
);

CREATE TABLE tour_translation_included_items (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    item text,
    display_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, display_order)
);

CREATE TABLE tour_translation_not_included_items (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    item text,
    display_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, display_order)
);

CREATE TABLE tour_translation_program_steps (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    label varchar(255),
    title varchar(255),
    description text,
    step_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, step_order)
);
