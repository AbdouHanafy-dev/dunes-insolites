-- Paid options on a circuit booking (single-tent upgrade, suite upgrade, a return city outside the
-- list) are sold as Extras of the new TOUR_OPTION category, priced per person per night
-- (PER_PERSON_NIGHT) or once (PER_BOOKING) from the back office. No schema change is needed for the
-- category or the pricing unit: extras.category and extras.pricing_unit are plain varchar(20)
-- ('PER_PERSON_NIGHT' is exactly 20 characters).

-- Some options only make sense for a group of a given size; blank = always shown.
ALTER TABLE extras ADD COLUMN min_party_size integer;
ALTER TABLE extras ADD CONSTRAINT extras_min_party_size_check CHECK (min_party_size IS NULL OR min_party_size >= 1);

-- A return city the guest typed because theirs is not in the list. The listed cities stay in
-- return_city, which is limited to the known cities by reservations_return_city_check.
ALTER TABLE reservations ADD COLUMN return_city_other varchar(120);
