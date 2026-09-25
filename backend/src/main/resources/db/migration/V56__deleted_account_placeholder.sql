-- The stand-in owner of reservations whose customer account was deleted (see DeletedAccount).
-- A reservation needs a user, so deleting an account re-points its reservations here instead
-- of being refused. No Keycloak identity exists for this row: nobody can sign in as it.
INSERT INTO users (user_id, email, name, role, has_special_remise, loyalty_points, loyalty_tier)
VALUES ('00000000-0000-4000-8000-00000000de1e', 'client-supprime@dunes-insolites.invalid',
        'Client supprimé', 'CLIENT', false, 0, 'BRONZE')
ON CONFLICT (user_id) DO NOTHING;
