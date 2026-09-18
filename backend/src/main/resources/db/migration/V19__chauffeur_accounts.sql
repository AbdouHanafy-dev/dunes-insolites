-- CHAUFFEUR joins the roles that can log in - widen the same check
-- constraint V10 already widened once for STAFF.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK ((role)::text = ANY ((ARRAY[
        'CLIENT','PARTENAIRE','CAMPING','ADMIN','STAFF','CHAUFFEUR'
    ]::character varying[])::text[]));

-- Optional link from a per-reservation Chauffeur assignment (free-text
-- name/phone, unchanged) to a real driver account, so that account can see
-- this trip via GET /api/chauffeurs/my-trips. Nullable: most chauffeurs
-- assigned today have no portal account at all.
ALTER TABLE chauffeurs ADD COLUMN driver_user_id uuid REFERENCES users(user_id);
CREATE INDEX idx_chauffeurs_driver_user ON chauffeurs (driver_user_id);
