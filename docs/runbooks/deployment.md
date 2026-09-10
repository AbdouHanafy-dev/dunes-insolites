# Runbook — deployment

Reproducible by someone other than the original developer. Assumes SSH to the
production host and the repo checked out there.

**Topology** (see also `docs/reports/phase6-nginx-seo.md`):

```
Cloudflare (proxied DNS, "Always Use HTTPS")
   │
origin host  ── nginx ──┬─▶ Next.js frontend   (npm start, 127.0.0.1:3000)
                        ├─▶ Spring backend     (docker-compose, 127.0.0.1:8080)  ── Postgres / Keycloak / RabbitMQ (127.0.0.1)
                        └─▶ WordPress          (legacy, still default — Phase 7)
```

The backend, DB, broker and IdP all bind `127.0.0.1` — nginx is the only ingress.

---

## 0. One-time host setup

- [ ] `.env` on the host (never committed) with every var the
  **ProductionConfigGuard** requires — the app refuses to start otherwise
  when `DEPLOY_ENV=production`:
  `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_RABBITMQ_HOST`,
  `SPRING_RABBITMQ_PASSWORD`, `KEYCLOAK_SERVER_URL`, `KEYCLOAK_CLIENT_SECRET`,
  `APP_FRONTEND_URL`, `SPRING_MAIL_PASSWORD` (or `management.health.mail.enabled=false`),
  and `DEPLOY_ENV=production` itself. None may contain `79.143.185.33`.
- [ ] `NEXT_PUBLIC_API_URL` + `DEPLOY_ENV=production` for the frontend build
  (the build fails closed without the API url — DI-031).
- [ ] Backup sidecar running with a real `OFFSITE_CMD` — see `backup-restore.md`.
- [ ] nginx vhost deployed as an **include behind a symlink** so rollback is one
  swap — see `nginx-seo-rollback.md`.
- [ ] Keycloak realm imported; client secret rotated (`DI-002-secret-rotation-checklist.md`).

## 1. Preflight (run from a clean checkout, anywhere)

```bash
npm ci
npm run release:check --if-present -- --it     # PASS required (or BLOCKED only on infra, understood)
BASE_URL=https://www.dunes-insolites.com SEO_PROFILE=wordpress npm run verify:seo   # baseline still green
```

`release:check` runs: secret scan · prod-config validation · typecheck · lint ·
web tests · backend unit + integration tests · the fail-closed build check ·
backup freshness. **Do not deploy on a FAIL.**

## 2. Backup before touching anything

```bash
ssh <host>
cd <repo>
PGPASSWORD=… ./scripts/db-backup.sh            # local dump + sha256 + off-host push
PGPASSWORD=… ./scripts/db-restore-verify.sh    # proves that dump restores cleanly
```

Both must succeed. Record the archive name + timestamp in the deploy log.

## 3. Migration validation (no schema change yet)

```bash
# Dry inspection — Flyway runs on app boot with ddl-auto: validate.
ls backend/src/main/resources/db/migration/          # V-numbers sequential, no gaps
git log --oneline -- backend/src/main/resources/db/migration/   # any new Vn since last deploy?
```

If a new migration is present, review it against `docs/runbooks/database-migrations.md`
(additive, no destructive change without a safety note, `USING` casts explicit).

## 4. Deploy the backend

```bash
cd backend
git pull
docker compose --env-file ../.env -f docker-compose.yml build backend
docker compose --env-file ../.env -f docker-compose.yml up -d backend
docker compose logs -f backend        # watch for: Flyway "Successfully validated", "Started DuneinsoliteApplication"
```

If `ProductionConfigGuard` throws on start, the log prints exactly which env var
is missing or wrong — fix `.env` and retry. Nothing is half-deployed: the old
container keeps serving until the new one is healthy.

## 5. Deploy the frontend

```bash
cd ../frontend
git pull && npm ci
NEXT_PUBLIC_API_URL=https://www.dunes-insolites.com/api DEPLOY_ENV=production npm run build
# restart whatever supervises `next start` (systemd unit / pm2 / compose)
sudo systemctl restart dunes-frontend      # example
```

## 6. Health + readiness

```bash
curl -fsS http://127.0.0.1:8080/actuator/health/readiness   # {"status":"UP"} — gated on DB + RabbitMQ
curl -fsS http://127.0.0.1:8080/actuator/health/liveness
curl -fsS http://127.0.0.1:3000/                             # frontend 200
```

## 7. Smoke tests (through the real domain)

```bash
BASE_URL=https://www.dunes-insolites.com SEO_PROFILE=wordpress npm run verify:seo   # 0 failed
curl -fsS https://www.dunes-insolites.com/nuitee-campement-desert/ | grep -q canonical
```

## 8. Booking + email test

- Create a real test reservation through the public site (a throwaway email you control).
- Confirm: a `reservations` row appears; the "reservation received" email arrives;
  `notification.dlq` count stays 0 (`GET /api/admin/ops/dead-letters` as ADMIN).
- Confirm the reservation as ADMIN → the proforma invoice generates, the
  confirmation notification arrives.
- Delete the test reservation afterward (soft-delete).

## 9. Rollback decision

Roll back if any of: readiness never goes UP · a ranked URL regressed
(`verify:seo` fail) · booking or email failed · DLQ climbing · 5xx spike.

## 10. Rollback

- **Backend:** `docker compose up -d backend` with the previous image tag
  (`docker image ls` → re-tag / re-deploy the prior build). No migration was
  applied this deploy (step 3) → no DB rollback needed. If a migration *was*
  applied and is now wrong: see `database-migrations.md` — forward-fix with a new
  Vn, or restore from step 2's backup (accepting the RPO window).
- **Frontend:** redeploy the previous build artifact / git tag.
- **nginx (if the split changed):** `nginx-seo-rollback.md` — one symlink swap.

## 11. Record

Append to the deploy log: timestamp, git SHA, migrations applied, backup archive
name, smoke-test result, rollback (Y/N), operator.
