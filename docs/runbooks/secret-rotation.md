# Runbook — secret rotation

Companion to [`../DI-002-secret-rotation-checklist.md`](../DI-002-secret-rotation-checklist.md)
(what's already been done + the outstanding list). This runbook is the
*procedure* for rotating each secret without downtime.

**Golden rules**
- A secret's value lives only in `.env` on each host (gitignored) / a secrets
  manager — never in a committed file. `npm run scan:secrets` enforces this in CI.
- Rotate at the source (Keycloak, Google, Postgres, RabbitMQ), then update every
  `.env`, then restart the consumer. The old value must be provably dead
  afterwards.
- `ProductionConfigGuard` fails the backend closed if a required secret is
  missing when `DEPLOY_ENV=production` — a stale/blank `.env` won't "keep
  working with the old value", it won't start.

---

## Where each secret is consumed

| Secret | Env var | Read by | Rotate at |
|---|---|---|---|
| DB password | `SPRING_DATASOURCE_PASSWORD` / `POSTGRES_PASSWORD` | backend, `db-backup.sh` (`PGPASSWORD`) | `ALTER ROLE … PASSWORD` |
| RabbitMQ password | `SPRING_RABBITMQ_PASSWORD` / `RABBITMQ_PASSWORD` | backend | `rabbitmqctl change_password` |
| Keycloak client secret | `KEYCLOAK_CLIENT_SECRET` | backend (token exchange) | Keycloak Admin → Clients → Credentials → Regenerate |
| Keycloak bootstrap admin | `KEYCLOAK_ADMIN_PASSWORD` | keycloak container only | compose env / Keycloak |
| Gmail app password | `SPRING_MAIL_PASSWORD` | backend (`EmailService`, `InvoiceEmailService`) | https://myaccount.google.com/apppasswords |
| Seed admin/camping | `SEED_ADMIN_PASSWORD`, `SEED_CAMPING_PASSWORD` | `Seed.java` (startup, only if set), seed scripts | Keycloak (change the account's password) |
| Cloudflare API token (if used for cache purge automation) | not in the app | ops scripts only | Cloudflare dashboard → API Tokens |

## Procedure (any secret)

1. **Announce** a short maintenance window if the consumer restart is
   customer-visible (backend restart ≈ 30–45s; the old container serves until
   the new one is healthy, so usually zero visible downtime).
2. **Generate** the new value at the source. Do **not** delete the old one yet.
3. **Update `.env`** on every host that runs the consumer (dev machine + prod
   host + any staging). One host at a time.
4. **Restart** the consumer: `docker compose --env-file ../.env up -d backend`
   (or the systemd unit). Watch logs for a clean start — no
   `ProductionConfigGuard` failure, no auth errors.
5. **Verify the new value works:** a real login (`/api/auth/login` → 200), a
   test email, a backup run — whichever the secret gates.
6. **Verify the old value is dead:** attempt the same operation with the old
   value from a scratch config → it must fail.
7. **Revoke** the old value at the source (delete the old Gmail app password,
   don't just leave it; drop the old DB role password by having rotated it).
8. **Scan:** `npm run scan:secrets` — confirm nothing new was committed.
9. **Record** in the deploy/ops log: which secret, when, who, verified.

## If a secret was committed (history exposure)

1. Rotate first (steps 2–7 above) — the value is already public, treat it as
   compromised regardless of how "private" the repo is.
2. Remove the current copy from the working tree; move it to `.env`.
3. Purge from history: `git filter-repo --replace-text` or BFG, then
   force-push, then have every clone re-clone.
4. Rotate **again** after the purge (the pre-purge value was fetched by anyone
   who pulled).
5. If customer data could have been reached with it → `incident-response.md`
   "Secret compromise" + "PII exposure".
