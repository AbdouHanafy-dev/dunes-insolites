# Newsletter launch-email SMTP — resolved and verified

15 Sep 2026. The cPanel SMTP migration, launch-email delivery path,
idempotence, and production health monitoring are complete and verified.

## The feature

Admin → Administration → Newsletter lists everyone who subscribed via the
launch-countdown page's notify form, with a button to email them all once
the real site opens ("C'est ouvert — l'aventure Dune Insolite vous
attend"). Idempotent: a subscriber is only marked `launch_email_sent_at`
once delivery actually succeeds, so pressing the button again only
retries whoever is still pending.

## Problems found, in the order they were hit

1. **Gmail auth broken.** `Authentication failed` on every send — the
   Gmail app-password credential on the VPS is dead (a known, previously
   flagged, never-rotated issue). Decision: move off Gmail entirely
   rather than rotate it, onto a real mailbox on `dunes-insolites.com`.

2. **A real bug, independent of the credential:** the code marked a
   subscriber as sent the moment the send was *triggered*, not once it
   *succeeded*. A failing send (any reason) permanently and silently
   marked people as notified even though nobody received anything.
   **Fixed** — `EmailService.sendLaunchAnnouncementEmail` is now
   synchronous and throws; `NewsletterServiceImpl` only marks a
   subscriber sent after it returns without throwing, and the response
   reports real `sent`/`failed` counts instead of "triggered for N".

3. **SMTP host/port/from were hardcoded to Gmail's shape** in
   `application.yml` — no way to point at another provider without a
   code change. **Fixed** — `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`,
   `SPRING_MAIL_SMTP_SSL_ENABLE`, `SPRING_MAIL_SMTP_STARTTLS_ENABLE`, and
   `APP_MAIL_FROM` are now all env-configurable (defaults preserve the
   old Gmail-over-STARTTLS behavior).

4. **`mail.dunes-insolites.com` DNS was wrong.** In Cloudflare it was a
   *proxied* CNAME to the bare domain (`dunes-insolites.com`), which
   points at the Next.js VPS — not at the real cPanel mail server, and
   Cloudflare's proxy never carries SMTP traffic (only 80/443) even when
   the target is right. **Fixed in Cloudflare**: changed to `A` record →
   `185.7.33.81` (the same IP as `webmail.dunes-insolites.com`), **DNS
   only** (grey cloud, not proxied). Confirmed live: port 465 is now
   reachable from the VPS after flushing its local resolver cache
   (`resolvectl flush-caches`).

5. **Sender verification rejection.** Once the connection actually
   reached the cPanel server: `550 Sender verify failed` — the "From"
   address (`noreply@duneinsolite.com`, EmailService's old hardcoded
   default) isn't a real mailbox on that server; cPanel refuses to relay
   for a "From" it doesn't host. Gmail never checked this, so it went
   unnoticed until switching provider. **Fixed** — `APP_MAIL_FROM` is now
   env-configurable (`application.yml` + `docker-compose.vps.yml`),
   meant to be set to the real mailbox, `contact@dunes-insolites.com`.

6. **The first `APP_MAIL_FROM` commit contained duplicate YAML keys.**
   Deploying `f26d45f` exposed two `app.mail` mappings in
   `application.yml`; Spring Boot 4 rejected the file and the backend
   restarted. **Fixed in `b534fe5`** by retaining the env-configurable
   mapping and removing the stale hardcoded mapping. The corrected YAML
   was parsed with duplicate-key checking before redeployment.

## Mailbox actually created

`contact@dunes-insolites.com`, created directly in cPanel → Email
Accounts (not OVH — OVH's "Email Pro"/Zimbra products were dead ends;
Zimbra's own domain-verification CNAME was added to Cloudflare too,
`ovh-zimbra-xvwlj3yr.dunes-insolites.com` → `ovh.com`, DNS only — harmless
if left in place, or delete it, since Zimbra was abandoned in favor of
the cPanel mailbox already on the same server as the WordPress-era
hosting).

Real settings (from cPanel's "Connect Devices" page for that mailbox):

```
SPRING_MAIL_HOST=mail.dunes-insolites.com
SPRING_MAIL_PORT=465
SPRING_MAIL_SMTP_SSL_ENABLE=true
SPRING_MAIL_SMTP_STARTTLS_ENABLE=false
SPRING_MAIL_USERNAME=contact@dunes-insolites.com
SPRING_MAIL_PASSWORD=<the mailbox's real password, in .env.vps only, never in chat/git>
APP_MAIL_FROM=contact@dunes-insolites.com
```

## Production verification — complete

Final deployed revision: `2d3e69a` (`ops: restore SMTP health check`).

- The recreated `dunes-v2-backend` container reported `running healthy`
  with zero restarts.
- The container had the intended non-secret settings: sender and username
  `contact@dunes-insolites.com`, host `mail.dunes-insolites.com`, port
  `465`, implicit SSL `true`, and STARTTLS `false`. Password presence was
  checked without printing its value.
- A controlled SMTP message from the production backend to
  `contact@dunes-insolites.com` succeeded.
- The protected launch endpoint returned `{"sent":3,"failed":0}`. Logs
  recorded three `✅ Launch announcement sent to:` entries (addresses
  masked) and the summary `3 subscriber(s), 0 failed`.
- The database then reported three sent subscribers and zero pending.
- A second protected call returned `{"sent":0,"failed":0}`, proving the
  production path is idempotent.
- `MANAGEMENT_HEALTH_MAIL_ENABLED` was restored to `true`; after
  recreation, `/actuator/health` returned `UP` and the container remained
  healthy with zero restarts.
- Temporary Keycloak identities used for the protected endpoint checks
  were deleted immediately after each check.

## Optional cleanup

The unused Zimbra verification CNAME
(`ovh-zimbra-xvwlj3yr.dunes-insolites.com` → `ovh.com`) remains harmless
and can be deleted in Cloudflare. It is unrelated to the working cPanel
mailbox and is not required for launch-email delivery.
