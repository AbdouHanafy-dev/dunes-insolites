-- Lets a circuit's practical texts be translated: good-to-know, pet policy note,
-- ticket info, and the three "not suitable for / not allowed / must bring" lists. Until now the
-- translated circuit page showed these in French whatever the visitor's language.
--
-- Additive only: new nullable columns and new tables, nothing existing is altered, moved or deleted,
-- so rows already in tour_translations keep their data and the French base columns stay the fallback.
-- IF NOT EXISTS keeps a re-run harmless.
ALTER TABLE tour_translations
    ADD COLUMN IF NOT EXISTS good_to_know text,
    ADD COLUMN IF NOT EXISTS pet_policy_note text,
    ADD COLUMN IF NOT EXISTS ticket_info text;

CREATE TABLE IF NOT EXISTS tour_translation_not_suitable_for (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    item text,
    display_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, display_order)
);

CREATE TABLE IF NOT EXISTS tour_translation_not_allowed (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    item text,
    display_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, display_order)
);

CREATE TABLE IF NOT EXISTS tour_translation_must_bring (
    tour_translation_id uuid NOT NULL REFERENCES tour_translations(tour_translation_id),
    item text,
    display_order integer NOT NULL,
    PRIMARY KEY (tour_translation_id, display_order)
);
