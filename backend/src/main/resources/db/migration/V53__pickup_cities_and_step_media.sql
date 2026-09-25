-- 1. A circuit may last up to a month (31 days = 744 h).
ALTER TABLE tours DROP CONSTRAINT tours_duration_hours_check;
ALTER TABLE tours
    ADD CONSTRAINT tours_duration_hours_check
        CHECK (duration_hours IS NULL OR duration_hours BETWEEN 1 AND 744);

-- 2. Which departure / return cities each circuit and each camp stay offers.
--    Chosen from the fixed city vocabulary (DepartureCity) in the backoffice;
--    the booking flows only show the ticked ones and the server enforces it.
CREATE TABLE tour_departure_cities (
    tour_id UUID NOT NULL REFERENCES tours (tour_id) ON DELETE CASCADE,
    city    VARCHAR(20) NOT NULL,
    PRIMARY KEY (tour_id, city)
);
CREATE TABLE tour_return_cities (
    tour_id UUID NOT NULL REFERENCES tours (tour_id) ON DELETE CASCADE,
    city    VARCHAR(20) NOT NULL,
    PRIMARY KEY (tour_id, city)
);
CREATE TABLE tour_type_departure_cities (
    tour_type_id UUID NOT NULL REFERENCES tour_types (tour_type_id) ON DELETE CASCADE,
    city         VARCHAR(20) NOT NULL,
    PRIMARY KEY (tour_type_id, city)
);
CREATE TABLE tour_type_return_cities (
    tour_type_id UUID NOT NULL REFERENCES tour_types (tour_type_id) ON DELETE CASCADE,
    city         VARCHAR(20) NOT NULL,
    PRIMARY KEY (tour_type_id, city)
);

-- Until now every city was offered everywhere: keep that for existing products,
-- so nothing changes on the live site until an editor unticks a city.
INSERT INTO tour_departure_cities (tour_id, city)
SELECT t.tour_id, c FROM tours t CROSS JOIN unnest(ARRAY[
    'TUNIS','SOUSSE','HAMMAMET','DJERBA','MAHDIA','MONASTIR','TOZEUR']) AS c;
INSERT INTO tour_return_cities (tour_id, city)
SELECT t.tour_id, c FROM tours t CROSS JOIN unnest(ARRAY[
    'TUNIS','SOUSSE','HAMMAMET','DJERBA','MAHDIA','MONASTIR','TOZEUR']) AS c;
INSERT INTO tour_type_departure_cities (tour_type_id, city)
SELECT t.tour_type_id, c FROM tour_types t CROSS JOIN unnest(ARRAY[
    'TUNIS','SOUSSE','HAMMAMET','DJERBA','MAHDIA','MONASTIR','TOZEUR']) AS c;
INSERT INTO tour_type_return_cities (tour_type_id, city)
SELECT t.tour_type_id, c FROM tour_types t CROSS JOIN unnest(ARRAY[
    'TUNIS','SOUSSE','HAMMAMET','DJERBA','MAHDIA','MONASTIR','TOZEUR']) AS c;

-- 3. Itinerary steps: an optional pickup point and any number of images.
--    ProgramStep is embedded in six tables, and Hibernate selects every column
--    of the embeddable from each of them (see V32), so all six get both columns.
ALTER TABLE tour_program_steps                    ADD COLUMN pickup_point VARCHAR(255), ADD COLUMN image_urls TEXT;
ALTER TABLE tour_translation_program_steps        ADD COLUMN pickup_point VARCHAR(255), ADD COLUMN image_urls TEXT;
ALTER TABLE tour_type_program_steps               ADD COLUMN pickup_point VARCHAR(255), ADD COLUMN image_urls TEXT;
ALTER TABLE tour_type_translation_program_steps   ADD COLUMN pickup_point VARCHAR(255), ADD COLUMN image_urls TEXT;
ALTER TABLE extra_program_steps                   ADD COLUMN pickup_point VARCHAR(255), ADD COLUMN image_urls TEXT;
ALTER TABLE extra_translation_program_steps       ADD COLUMN pickup_point VARCHAR(255), ADD COLUMN image_urls TEXT;
