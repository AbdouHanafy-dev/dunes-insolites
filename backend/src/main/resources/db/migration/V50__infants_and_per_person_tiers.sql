-- Infants (0-3) as a third guest type, priced separately and free until the
-- back office sets a price. Infants do not count toward capacity or party size.
ALTER TABLE reservations              ADD COLUMN number_of_infants INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reservation_tours         ADD COLUMN number_of_infants INTEGER NOT NULL DEFAULT 0,
                                      ADD COLUMN infant_price numeric(15,3) NOT NULL DEFAULT 0;
ALTER TABLE reservation_tour_types    ADD COLUMN number_of_infants INTEGER NOT NULL DEFAULT 0,
                                      ADD COLUMN infant_price numeric(15,3) NOT NULL DEFAULT 0;
ALTER TABLE reservation_tour_hebergements ADD COLUMN number_of_infants INTEGER NOT NULL DEFAULT 0;

-- Catalogue prices for infants: circuits and the stay itself (bivouac, or any stay without tiers).
ALTER TABLE tours      ADD COLUMN passenger_infant_price numeric(15,3) NOT NULL DEFAULT 0;
ALTER TABLE tour_types ADD COLUMN passenger_infant_price numeric(15,3) NOT NULL DEFAULT 0;

-- Accommodation tiers are now priced per person per night, one price per guest type,
-- instead of one price per unit. NULL adult price = not configured = not bookable
-- (same fail-closed rule the unit price had).
ALTER TABLE accommodation_types
    ADD COLUMN adult_price_ttc  numeric(15,3),
    ADD COLUMN child_price_ttc  numeric(15,3),
    ADD COLUMN infant_price_ttc numeric(15,3),
    ADD CONSTRAINT accommodation_types_person_prices_check CHECK (
        (adult_price_ttc  IS NULL OR adult_price_ttc  >= 0) AND
        (child_price_ttc  IS NULL OR child_price_ttc  >= 0) AND
        (infant_price_ttc IS NULL OR infant_price_ttc >= 0));

-- Carry the old unit price over so a full unit costs the same as before:
-- unit price / capacity per adult, child priced like an adult, infants free.
UPDATE accommodation_types
SET adult_price_ttc  = ROUND(unit_price_ttc / GREATEST(capacity, 1), 3),
    child_price_ttc  = ROUND(unit_price_ttc / GREATEST(capacity, 1), 3),
    infant_price_ttc = 0
WHERE unit_price_ttc IS NOT NULL;

-- Booking snapshot: who sleeps in this tier and what each guest type paid per night.
-- Rows made before this migration keep NULLs and are still totalled units x unit price.
ALTER TABLE reservation_accommodations
    ADD COLUMN adults             INTEGER,
    ADD COLUMN children           INTEGER,
    ADD COLUMN infants            INTEGER,
    ADD COLUMN adult_price_ttc    numeric(15,3),
    ADD COLUMN child_price_ttc    numeric(15,3),
    ADD COLUMN infant_price_ttc   numeric(15,3);
