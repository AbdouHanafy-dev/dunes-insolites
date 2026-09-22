-- Tour "Additional info" section (GetYourGuide-style wizard, third slice —
-- see V25 completeness gate and V26 guide/food/transport).

ALTER TABLE public.tours
    ADD COLUMN animals_accepted boolean NOT NULL DEFAULT false,
    ADD COLUMN pet_policy_note text,
    ADD COLUMN good_to_know text,
    ADD COLUMN emergency_phone varchar(50),
    ADD COLUMN ticket_info text;

CREATE TABLE public.tour_not_suitable_for (
    tour_id uuid NOT NULL,
    item text,
    display_order integer NOT NULL,
    CONSTRAINT tour_not_suitable_for_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_not_suitable_for_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);

CREATE TABLE public.tour_not_allowed (
    tour_id uuid NOT NULL,
    item text,
    display_order integer NOT NULL,
    CONSTRAINT tour_not_allowed_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_not_allowed_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);

CREATE TABLE public.tour_must_bring (
    tour_id uuid NOT NULL,
    item text,
    display_order integer NOT NULL,
    CONSTRAINT tour_must_bring_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_must_bring_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);
