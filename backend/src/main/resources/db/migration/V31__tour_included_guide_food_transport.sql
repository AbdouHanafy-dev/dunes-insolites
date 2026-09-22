-- Tour "Included" sub-steps: who guides, food, transport (GetYourGuide-style
-- wizard, second slice - see the completeness/verification gate migration
-- V25 for the first).

ALTER TABLE public.tours
    ADD COLUMN guide_type varchar(20) NOT NULL DEFAULT 'NONE',
    ADD COLUMN food_included boolean NOT NULL DEFAULT false,
    ADD COLUMN drinks_included boolean NOT NULL DEFAULT false,
    ADD COLUMN transport_included boolean NOT NULL DEFAULT false;

CREATE TABLE public.tour_meals (
    tour_id uuid NOT NULL,
    meal_type varchar(20) NOT NULL,
    meal_format varchar(20) NOT NULL,
    display_order integer NOT NULL,
    CONSTRAINT tour_meals_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_meals_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);

CREATE TABLE public.tour_dietary_restrictions (
    tour_id uuid NOT NULL,
    restriction text,
    display_order integer NOT NULL,
    CONSTRAINT tour_dietary_restrictions_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_dietary_restrictions_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);

CREATE TABLE public.tour_transport_modes (
    tour_id uuid NOT NULL,
    mode text,
    display_order integer NOT NULL,
    CONSTRAINT tour_transport_modes_pkey PRIMARY KEY (tour_id, display_order),
    CONSTRAINT tour_transport_modes_tour_fk FOREIGN KEY (tour_id) REFERENCES public.tours(tour_id)
);
