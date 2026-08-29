# backend/docker/

## `keycloak-realm-duneinsolite.json`

The `duneinsolite` realm — clients, roles (`ADMIN`/`CAMPING`/`PARTENAIRE`/
`CLIENT`, matching `UserRole.java`), and the `duneinsolite-api` client's
service account role mappings. Exported from this dev box's Keycloak (29
Aug 2026) via its own Admin API
(`/admin/realms/duneinsolite/partial-export`), because until that date
this realm existed only as manually-configured state inside one long-lived
Keycloak container's data volume — nowhere in this repo, undocumented, and
un-reproducible. Found the hard way: `backend/docker-compose.staging.yml`
(DI-007) had existed since Sprint 0 but had never actually been run: a
genuinely fresh Keycloak has no realm, and the backend's own startup
seeding (`Seed.java` → `KeycloakUserSyncService`) crash-loops trying to
create a user inside a realm that was never created.

`docker-compose.yml`'s `keycloak` service now mounts this file into
`/opt/keycloak/data/import/` and runs `start-dev --import-realm`, which
imports it on boot **only if the realm doesn't already exist** — safe
against this dev box's own Keycloak (its realm is already there, older
than this file) and required for a genuinely fresh one (a new checkout,
staging, or real production on day one).

**Scrubbed before committing, verified, not assumed clean:**
- No real client secret — Keycloak's own export API masks it as
  `"**********"`, confirmed by reading the exported JSON before it was
  ever written to disk. That string becomes the literal secret on import,
  so **regenerating it is a required step**, documented in
  `.env.staging.example` right next to `KEYCLOAK_CLIENT_SECRET` - not
  optional, and not safe to skip.
- No real users, passwords, or password hashes — the top-level `users`
  array holds exactly one entry, the `duneinsolite-api` client's
  auto-generated service account, with only the realm/client role
  mappings it needs (`realm-management`: `view-users`, `manage-realm`,
  `query-users`, `manage-users`) to let the backend manage users on
  Keycloak's behalf. No SMTP credentials either — `smtpServer` in the
  real realm is empty.

**Verified live, 29 Aug 2026:** tore down and rebuilt the entire staging
stack from nothing against this file (`docker compose -p
duneinsolite-staging -f docker-compose.yml -f docker-compose.staging.yml
up`) — real log line `Realm 'duneinsolite' imported`, regenerated the
client secret via the Admin API, brought up the `backend` service against
it, and got a real `200` from `/api/auth/login` with the seeded staging
admin account. Not assumed correct — booted, end to end, from an empty
volume.

## `init-keycloak-db.sql`

Runs once, the first time the `postgres` container's data volume is
created (Postgres's own `docker-entrypoint-initdb.d` convention) —
creates the separate `keycloak_db` database `KC_DB_URL` in
`docker-compose.yml` points at, alongside this app's own `duneinsolite`
database, both in the same Postgres instance.
