-- Tour wizard completeness + verification gate: DRAFT/IN_REVIEW/PUBLISHED/
-- REJECTED workflow, keywords, and richer itinerary segments. See
-- ARCHITECTURE.md / the Tour wizard plan for why this exists.

ALTER TABLE public.tours
    ADD COLUMN status varchar(20) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN insurance_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN compliance_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN copyright_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN rejection_reason text;

-- Existing published tours are already live - carry that forward as
-- PUBLISHED rather than forcing every existing tour back through review.
UPDATE public.tours SET status = 'PUBLISHED' WHERE is_active = true;

CREATE TABLE public.tour_keywords (
    tour_id uuid NOT NULL,
    keyword text,
    display_order integer NOT NULL,
    CONSTRAINT tour_keywords_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_keywords_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);

-- ProgramStep is a shared @Embeddable (Tour and TourType both map it), so
-- both collection tables need the same new columns.
ALTER TABLE public.tour_program_steps
    ADD COLUMN segment_type varchar(20) NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN optional_segment boolean NOT NULL DEFAULT false,
    ADD COLUMN duration_minutes integer;

ALTER TABLE public.tour_type_program_steps
    ADD COLUMN segment_type varchar(20) NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN optional_segment boolean NOT NULL DEFAULT false,
    ADD COLUMN duration_minutes integer;
