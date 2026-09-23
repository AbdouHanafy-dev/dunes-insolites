-- Whether a nuitée offers accommodation types (Desert Tent / Room / Dune
-- Suite ...) for the guest to pick. Defaults to true so every existing stay
-- behaves exactly as before; an admin opts a stay out in the back office.
-- When false the vitrine hides the accommodation step and the stay is priced
-- per person (same path the bivouac already uses).
ALTER TABLE tour_types
    ADD COLUMN has_accommodation_types boolean NOT NULL DEFAULT true;
