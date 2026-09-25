-- Itinerary steps by position: the first step may name a pickup point (V53), the
-- last a drop-off point, any step in between an attraction. Same six tables as
-- V53, because ProgramStep is embedded in all of them.
ALTER TABLE tour_program_steps                    ADD COLUMN dropoff_point VARCHAR(255), ADD COLUMN attraction VARCHAR(255);
ALTER TABLE tour_translation_program_steps        ADD COLUMN dropoff_point VARCHAR(255), ADD COLUMN attraction VARCHAR(255);
ALTER TABLE tour_type_program_steps               ADD COLUMN dropoff_point VARCHAR(255), ADD COLUMN attraction VARCHAR(255);
ALTER TABLE tour_type_translation_program_steps   ADD COLUMN dropoff_point VARCHAR(255), ADD COLUMN attraction VARCHAR(255);
ALTER TABLE extra_program_steps                   ADD COLUMN dropoff_point VARCHAR(255), ADD COLUMN attraction VARCHAR(255);
ALTER TABLE extra_translation_program_steps       ADD COLUMN dropoff_point VARCHAR(255), ADD COLUMN attraction VARCHAR(255);
