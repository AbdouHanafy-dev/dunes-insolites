# Runbook — database migrations (Flyway)

**Status:** Flyway introduced 2 Sep 2026 (production-hardening item 1). Before
this, the schema was managed entirely by Hibernate `ddl-auto: update`.

---

## The model

| Thing | Value |
|---|---|
| Tool | Flyway (`spring-boot-starter-flyway`, auto-run on app boot) |
| Migration location | `backend/src/main/resources/db/migration/` |
| Naming | `V<n>__<snake_case_description>.sql` (e.g. `V2__add_accommodation_type.sql`) |
| Schema authority | Flyway. **`spring.jpa.hibernate.ddl-auto` is `validate`** — Hibernate checks entities against the migrated schema on boot and fails fast on drift; it never mutates. |
| Baseline | `V1__baseline_schema.sql` — the full schema as it existed on 2 Sep 2026 |

### How the baseline behaves

`spring.flyway.baseline-on-migrate=true` + `baseline-version=1`:

- **Existing database** (has tables, no `flyway_schema_history`): on first boot
  Flyway creates `flyway_schema_history`, inserts one `BASELINE` marker row at
  version 1, and **does not execute `V1`**. Verified against the dev database
  (61 tables) — boot logged `Successfully baselined schema with version: 1` /
  `No migration necessary`, app started, `ddl-auto: validate` passed.
- **Brand-new empty database**: Flyway runs `V1` normally, creating the full
  schema, then any `V2+`. Verified against a fresh database — 61 tables + the
  history table created, history row `success=t`.

So the same jar is safe to deploy against a fresh production database and
against any host that already has the `ddl-auto`-built schema.

---

## Writing a new migration

1. Add `backend/src/main/resources/db/migration/V<next>__<desc>.sql`.
2. Write forward-only SQL. No `DROP` of a column/table that still holds data
   without an explicit, reviewed data-migration step.
3. Update the JPA entities to match.
4. Run the backend locally (`SPRING_PROFILES_ACTIVE=local`) — Flyway applies the
   migration, then `ddl-auto: validate` confirms entities and schema agree. A
   mismatch fails the boot with `Schema-validation:` — that is the safety net
   working.
5. Run `npm run backend:test:unit`, then the integration job (item 6) which
   applies every migration against a throwaway Postgres.

### Rollback

Flyway OSS has no automatic `undo`. Rollback strategy:

- **Additive migration** (new nullable column, new table, new index
  `CONCURRENTLY`): safe to leave in place; roll back the application only.
- **Destructive / rewriting migration**: ship the reverse as the *next*
  migration (`V<n+1>__revert_...sql`), and take a database backup immediately
  before deploying the forward one (see `backup-restore.md`). Never edit or
  delete an already-applied migration file — Flyway validates checksums and
  will refuse to start.

---

## Regenerating / verifying the baseline before production cutover

`V1__baseline_schema.sql` was produced from `pg_dump --schema-only` of the
**dev** database. `ddl-auto: update` never drops columns or constraints, so a
long-lived database can accumulate orphans that a fresh `V1` will not have.

**If a real production database already exists at cutover time:**

```bash
# 1. dump the real production schema
pg_dump -h <prod-host> -U <user> -d duneinsolite \
  --schema-only --no-owner --no-privileges -T flyway_schema_history \
  > prod-schema.sql

# 2. create a scratch DB, apply V1 to it
createdb baseline_check
psql -d baseline_check -f backend/src/main/resources/db/migration/V1__baseline_schema.sql

# 3. dump that and compare
pg_dump -d baseline_check --schema-only --no-owner --no-privileges \
  -T flyway_schema_history > v1-schema.sql
diff prod-schema.sql v1-schema.sql
```

Ignore cosmetic `CHECK (... = ANY (ARRAY[...]))` rendering differences —
PostgreSQL normalises these expressions differently on catalog read-back; they
are semantically identical and `ddl-auto: validate` does not inspect them.
Any **table / column / type / FK / PK / NOT NULL** difference is real: add a
`V2` migration to reconcile prod, or fix `V1` **only if it has never been
applied to any environment**.

---

## Quick reference

```bash
# what version is a database at?
psql -d duneinsolite -c \
  "SELECT installed_rank, version, description, type, success FROM flyway_schema_history ORDER BY installed_rank;"

# apply pending migrations manually (normally automatic on app boot)
docker run --rm --network backend_duneinsolite-network \
  -v "<abs-path>/backend/src/main/resources/db/migration:/flyway/sql:ro" \
  flyway/flyway:10 \
  -url=jdbc:postgresql://duneinsolite-postgres:5432/duneinsolite \
  -user=postgres -password=<pw> \
  -baselineOnMigrate=true -baselineVersion=1 \
  -locations=filesystem:/flyway/sql migrate
```
