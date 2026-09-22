-- V25 added segment_type/optional_segment/duration_minutes to
-- tour_program_steps and tour_type_program_steps, but missed the other
-- four tables that map the same shared ProgramStep @Embeddable: Extra's own
-- program steps, and the *_translation_program_steps tables for Tour,
-- TourType and Extra. Hibernate schema validation caught the gap at
-- startup (missing column [duration_minutes] in table
-- [extra_program_steps]) rather than in code review.

ALTER TABLE public.extra_program_steps
    ADD COLUMN segment_type varchar(20) NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN optional_segment boolean NOT NULL DEFAULT false,
    ADD COLUMN duration_minutes integer;

ALTER TABLE public.tour_translation_program_steps
    ADD COLUMN segment_type varchar(20) NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN optional_segment boolean NOT NULL DEFAULT false,
    ADD COLUMN duration_minutes integer;

ALTER TABLE public.tour_type_translation_program_steps
    ADD COLUMN segment_type varchar(20) NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN optional_segment boolean NOT NULL DEFAULT false,
    ADD COLUMN duration_minutes integer;

ALTER TABLE public.extra_translation_program_steps
    ADD COLUMN segment_type varchar(20) NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN optional_segment boolean NOT NULL DEFAULT false,
    ADD COLUMN duration_minutes integer;
