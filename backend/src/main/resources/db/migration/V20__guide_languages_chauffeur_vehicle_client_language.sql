-- Separates "guide" (translator, speaks languages) from "chauffeur" (drives
-- their own vehicle) more precisely: a guide's spoken languages, a
-- chauffeur's vehicle, and the client's own preferred language(s) so admin
-- can match the two instead of guessing from a name.
--
-- Languages are an admin-managed catalog (spoken_languages), not a
-- hardcoded FR/EN/AR enum - real guides speak German, Italian, Spanish,
-- etc., and the list needed to grow without a code change.

CREATE TABLE spoken_languages (
    language_id uuid NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE,
    active boolean NOT NULL DEFAULT true
);

-- Seed with the languages already in real use (the old FR/EN/AR enum) plus
-- the two explicitly requested (German, Italian) - a starting point admin
-- can extend from /api/languages, not a closed list.
INSERT INTO spoken_languages (language_id, name, active) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Français', true),
    ('a1000000-0000-0000-0000-000000000002', 'Anglais', true),
    ('a1000000-0000-0000-0000-000000000003', 'Arabe', true),
    ('a1000000-0000-0000-0000-000000000004', 'Allemand', true),
    ('a1000000-0000-0000-0000-000000000005', 'Italien', true);

CREATE TABLE guide_languages (
    guide_id uuid NOT NULL REFERENCES guides(guide_id),
    language_id uuid NOT NULL REFERENCES spoken_languages(language_id),
    PRIMARY KEY (guide_id, language_id)
);

ALTER TABLE chauffeurs ADD COLUMN vehicle_model character varying(255);
ALTER TABLE chauffeurs ADD COLUMN number_of_seats integer;

CREATE TABLE reservation_preferred_languages (
    reservation_id uuid NOT NULL REFERENCES reservations(reservation_id),
    language_id uuid NOT NULL REFERENCES spoken_languages(language_id),
    PRIMARY KEY (reservation_id, language_id)
);

ALTER TABLE reservations ADD COLUMN other_language_requested character varying(255);
