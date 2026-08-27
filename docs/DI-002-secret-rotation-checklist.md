# DI-002 — secret rotation checklist

`.env` was already gitignored and untracked before today. What was still
wrong, fixed in this pass:

- `backend/docker-compose.yml` had the RabbitMQ password (`duneinsolite123`)
  and the Keycloak bootstrap admin password (`admin`) **committed in plain
  text**. Both now come from `${RABBITMQ_PASSWORD}` / `${KEYCLOAK_ADMIN_PASSWORD}`.
- `application.yml` defaulted `spring.mail.username` to a real address
  (`bacemakkari25@gmail.com`) and the RabbitMQ password to `duneinsolite123`
  when the env var was unset — silently reusing production-shaped secrets
  as fallbacks. Both defaults are removed; the app now requires the env var.
- `KC_HOSTNAME` was hardcoded to the production IP in `docker-compose.yml`;
  now `${KC_HOSTNAME}` (needed anyway so staging, see DI-007, doesn't collide
  with production).

None of that changes what a secret's *value* is — only where it can leak
from. The two secrets CLAUDE.md already calls out as compromised still need
rotating by hand, because rotation happens in Gmail/Keycloak's own UI, not
in this repo:

## Still outstanding — needs your action

- [ ] **Gmail app password** (`SPRING_MAIL_PASSWORD`, account
      `dunesinsolites@gmail.com` / `bacemakkari25@gmail.com`) — revoke the
      current app password at https://myaccount.google.com/apppasswords and
      issue a new one. Update `.env` on every host that runs the backend
      (dev machine, and the production server) — the placeholder default
      was just removed from `application.yml`, so a stale `.env` will now
      fail to start rather than silently keep working with the old value.
- [ ] **Keycloak client secret** (`KEYCLOAK_CLIENT_SECRET`, client
      `duneinsolite-api`) — in the Keycloak admin console, Clients →
      `duneinsolite-api` → Credentials → **Regenerate Secret**. Update
      `.env` on every host immediately after — the old secret stops working
      the moment it's regenerated, so this is a coordinated cutover, not an
      independent step.
- [ ] After both are rotated, treat the old values as permanently
      compromised — do not reuse them, even in staging.

## Verify after rotating

```bash
npm run backend:run
# confirm login (POST /api/auth/login) succeeds
# trigger a confirmation email and confirm it sends
```

An unset `SPRING_MAIL_PASSWORD`, `KEYCLOAK_CLIENT_SECRET`,
`RABBITMQ_PASSWORD` or `KEYCLOAK_ADMIN_PASSWORD` now fails fast (empty
string / container won't authenticate) instead of falling back to a
committed value — that's the intended behavior change from this pass.
