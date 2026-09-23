-- A multi-day circuit can now declare that it sleeps a night at the Sabria
-- camp, reusing that camp's own accommodation tiers.
ALTER TABLE tours
    ADD COLUMN overnights_at_camp boolean NOT NULL DEFAULT false;

-- reservation_accommodations can now attach to either a Stay's
-- reservation_tour_types line OR a circuit's reservation_tour_hebergements
-- night — exactly one of the two FKs is set (same convention as
-- reservation_repartitions).
ALTER TABLE reservation_accommodations
    ALTER COLUMN reservation_tour_type_id DROP NOT NULL,
    ADD COLUMN reservation_tour_hebergement_id uuid,
    ADD CONSTRAINT reservation_accommodations_hebergement_fk
        FOREIGN KEY (reservation_tour_hebergement_id) REFERENCES reservation_tour_hebergements(hebergement_id) ON DELETE CASCADE;

CREATE INDEX reservation_accommodations_rth_idx ON reservation_accommodations (reservation_tour_hebergement_id);

ALTER TABLE reservation_accommodations
    ADD CONSTRAINT reservation_accommodations_exactly_one_parent_chk
        CHECK ((reservation_tour_type_id IS NOT NULL) <> (reservation_tour_hebergement_id IS NOT NULL));
