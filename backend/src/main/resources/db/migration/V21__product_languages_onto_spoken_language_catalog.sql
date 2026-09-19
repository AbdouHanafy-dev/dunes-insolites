-- Extra/Tour/TourType.languages (which languages a tour/activity is offered
-- in) moves off the old hardcoded FR/EN/AR enum onto the same admin-managed
-- spoken_languages catalog Guide.languages and Reservation.preferredLanguages
-- already use (V20) - one language system instead of two, and a guide or
-- tour can be offered in German/Italian/whatever admin adds, not just three.
--
-- Existing rows are backfilled by name (FR -> Français etc, the exact seed
-- rows V20 inserted) rather than dropped, since real Tour/Extra content
-- already has languages set.

ALTER TABLE extra_languages ADD COLUMN language_id uuid;
UPDATE extra_languages el SET language_id = sl.language_id
    FROM spoken_languages sl
    WHERE sl.name = CASE el.language
        WHEN 'FR' THEN 'Français' WHEN 'EN' THEN 'Anglais' WHEN 'AR' THEN 'Arabe' END;
ALTER TABLE extra_languages DROP CONSTRAINT extra_languages_language_check;
ALTER TABLE extra_languages DROP COLUMN language;
ALTER TABLE extra_languages ALTER COLUMN language_id SET NOT NULL;
ALTER TABLE extra_languages ADD CONSTRAINT fk_extra_languages_language
    FOREIGN KEY (language_id) REFERENCES spoken_languages(language_id);

ALTER TABLE tour_languages ADD COLUMN language_id uuid;
UPDATE tour_languages tl SET language_id = sl.language_id
    FROM spoken_languages sl
    WHERE sl.name = CASE tl.language
        WHEN 'FR' THEN 'Français' WHEN 'EN' THEN 'Anglais' WHEN 'AR' THEN 'Arabe' END;
ALTER TABLE tour_languages DROP CONSTRAINT tour_languages_language_check;
ALTER TABLE tour_languages DROP COLUMN language;
ALTER TABLE tour_languages ALTER COLUMN language_id SET NOT NULL;
ALTER TABLE tour_languages ADD CONSTRAINT fk_tour_languages_language
    FOREIGN KEY (language_id) REFERENCES spoken_languages(language_id);

ALTER TABLE tour_type_languages ADD COLUMN language_id uuid;
UPDATE tour_type_languages ttl SET language_id = sl.language_id
    FROM spoken_languages sl
    WHERE sl.name = CASE ttl.language
        WHEN 'FR' THEN 'Français' WHEN 'EN' THEN 'Anglais' WHEN 'AR' THEN 'Arabe' END;
ALTER TABLE tour_type_languages DROP CONSTRAINT tour_type_languages_language_check;
ALTER TABLE tour_type_languages DROP COLUMN language;
ALTER TABLE tour_type_languages ALTER COLUMN language_id SET NOT NULL;
ALTER TABLE tour_type_languages ADD CONSTRAINT fk_tour_type_languages_language
    FOREIGN KEY (language_id) REFERENCES spoken_languages(language_id);
