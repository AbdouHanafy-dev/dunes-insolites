-- V10__custom_roles.sql
-- Admin-creatable custom roles (on request, 15 Sep 2026), additive to the
-- existing fixed 4-role system (CLIENT/PARTENAIRE/CAMPING/ADMIN) rather
-- than replacing it — that system stays exactly as-is (users.role,
-- role_permissions, RolePermissionServiceImpl's ADMIN=always-FULL /
-- CLIENT=always-NONE hardcoding, and every hasRole()/hasAnyRole() check
-- across the ~30 business-endpoint controllers are all untouched). A
-- custom role is a separate, named bundle of AdminResource permissions an
-- admin defines and attaches to a STAFF account; it can only ever reach
-- the same @perm.can(...)-gated CMS-ish surface the existing matrix
-- covers — never the hardcoded business endpoints (reservations,
-- invoices, etc.), which is the deliberately scoped-down version of this
-- feature (the alternative — rewriting those ~66 checks — was assessed
-- as a much larger, separate change).
CREATE TABLE custom_roles (
    name character varying(64) NOT NULL,
    label character varying(120) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL DEFAULT now(),
    CONSTRAINT custom_roles_pkey PRIMARY KEY (name)
);

CREATE TABLE custom_role_permissions (
    id uuid NOT NULL,
    custom_role_name character varying(64) NOT NULL,
    resource character varying(255) NOT NULL,
    level character varying(255) NOT NULL,
    CONSTRAINT custom_role_permissions_pkey PRIMARY KEY (id),
    CONSTRAINT uk_custom_role_resource UNIQUE (custom_role_name, resource),
    CONSTRAINT fk_custom_role_permissions_role
        FOREIGN KEY (custom_role_name) REFERENCES custom_roles (name) ON DELETE CASCADE,
    -- Same resource enum every existing role_permissions row validates
    -- against (see role_permissions_resource_check in V1/V8/V9) — kept in
    -- lockstep by hand, same as those.
    CONSTRAINT custom_role_permissions_resource_check CHECK ((resource)::text = ANY ((ARRAY[
        'USERS','RESERVATIONS','INVOICES','TRANSACTIONS','TOURS','TOUR_TYPES',
        'EXTRAS','REVIEWS','AVAILABILITY','PAGES','CONTENT_BLOCKS','MEDIA',
        'NAVIGATION','REDIRECTS','GALLERY','MAINTENANCE_WINDOWS','NEWSLETTER_SUBSCRIBERS'
    ]::character varying[])::text[])),
    CONSTRAINT custom_role_permissions_level_check
        CHECK ((level)::text = ANY ((ARRAY['NONE','READ','EDIT','FULL']::character varying[])::text[]))
);

-- One custom role per account for v1 — simplest UX (a single "role" picker
-- slot, same shape as the existing built-in role dropdown) and enough for
-- the actual ask ("create a role, give it permissions, assign it"). A
-- true many-to-many can follow if one custom role per person turns out
-- not to be enough in practice.
ALTER TABLE users ADD COLUMN custom_role_name character varying(64) NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_custom_role
    FOREIGN KEY (custom_role_name) REFERENCES custom_roles (name) ON DELETE SET NULL;

-- STAFF: the "this account's real access comes entirely from its attached
-- custom role, not from a fixed archetype" base role — forcing a
-- custom-role account to also be CAMPING would additionally hand it
-- every hardcoded business endpoint CAMPING already has access to
-- (reservations, invoices...), which defeats the point of a deliberately
-- narrow custom role. STAFF has no hasRole('STAFF')/hasAnyRole(...,
-- 'STAFF') check anywhere in the codebase, so on its own it grants
-- nothing at all — same "blank slate" property the AdminResource matrix
-- already relies on for CAMPING/PARTENAIRE defaulting to NONE.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK ((role)::text = ANY ((ARRAY[
        'CLIENT','PARTENAIRE','CAMPING','ADMIN','STAFF'
    ]::character varying[])::text[]));
