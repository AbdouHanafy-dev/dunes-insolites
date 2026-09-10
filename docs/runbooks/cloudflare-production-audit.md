# Runbook — Cloudflare production audit (launch blocker)

**Status:** `REQUIRES PRODUCTION ACCESS`. Production `www.dunes-insolites.com`
resolves through **Cloudflare** (discovered in Phase 6 — every earlier doc wrongly
said "nginx is the sole ingress"). Nothing in this repository can confirm the
live Cloudflare configuration. This is the checklist to run **with dashboard
access** before go-live; until then every row is a launch risk, not a
verified fact.

Request flow (intended): `client → Cloudflare edge → origin nginx → { Next.js
frontend | Next.js admin | Spring Boot API | WordPress (until SEO cutover) }`.

## How to record results

For each row write `VERIFIED (date, who)` with the observed value, or
`MISCONFIGURED → <fix>`, or `N/A`. Do not leave a row blank.

## DNS & proxy

- [ ] `www` and apex records exist and are **proxied** (orange cloud), not DNS-only
- [ ] apex → `www` (or vice-versa) canonical redirect matches the SEO decision (French default at root, `/en` under `www`)
- [ ] no stale record still pointing at the old WordPress host / `79.143.185.33`
- [ ] origin IP is **not** exposed elsewhere (no `direct.` record, no historical A record in cert-transparency logs that still resolves)

## TLS / SSL

- [ ] SSL/TLS mode is **Full (strict)** — never "Flexible" (Flexible = plaintext Cloudflare→origin)
- [ ] origin has a valid cert Cloudflare trusts (Cloudflare Origin CA cert or a real CA cert), not the self-signed placeholder
- [ ] minimum TLS 1.2; TLS 1.3 enabled
- [ ] **Always Use HTTPS** on; **Automatic HTTPS Rewrites** on
- [ ] HSTS: decide max-age with the team before enabling (it is sticky) — record the decision

## Caching

- [ ] default cache level does **not** cache HTML by default, OR a page rule/cache-rule bypasses cache for:
  - [ ] `/(en|de|it|da|ar)?/(account|book|bookings|login|signup|...)` — authenticated customer routes
  - [ ] everything the admin app serves
  - [ ] `*/api/*` — **API responses must never be edge-cached** (they carry per-user data and `Set-Cookie`)
  - [ ] `/api/notifications/subscribe` (SSE) — must not be buffered/cached
- [ ] static assets (`/_next/static/*`, `/images/*`, `/media/*`) **are** cached with a long TTL
- [ ] "Respect existing headers" or an explicit rule so `Cache-Control: private`/`no-store` from the origin is honoured
- [ ] cache purge procedure documented (deploy step in `deployment.md` references it)

## Compression / buffering

- [ ] Brotli on
- [ ] SSE (`text/event-stream`) passes through unbuffered — test `curl -N https://www.dunes-insolites.com/api/notifications/subscribe?access_token=...` shows events streaming, not a hang then a dump
- [ ] WebSocket support on (not currently used, but confirm it is not actively blocked)

## Limits

- [ ] max upload body size ≥ the media-upload limit (8 MB) — Cloudflare Free caps at 100 MB, fine; confirm no lower Page Rule
- [ ] proxy read timeout ≥ the longest legitimate API call (invoice PDF / report generation)

## Security

- [ ] WAF managed ruleset on; note any rule that has to be tuned for the API (`/api/**` JSON bodies, admin PUT/PATCH)
- [ ] rate limiting on `/api/auth/login`, `/api/auth/register`, `/api/public/{bookings,stay-bookings,contact,subscribe}` — the origin also rate-limits these (`SecurityConfig`), Cloudflare is defence in depth
- [ ] Bot Fight Mode / bot management: confirm it does **not** block the legitimate booking POST or the Googlebot crawl of ranked URLs
- [ ] security headers: decide whether Cloudflare or the origin owns CSP/`X-Frame-Options`/`Referrer-Policy` (pick one; the Next apps can set them) — record which
- [ ] "Development Mode" is **off** (it disables caching for 3h and is easy to leave on)

## Origin protection

- [ ] origin nginx firewall allows **only** Cloudflare IP ranges on 443 (so the origin cannot be hit directly, bypassing the WAF) — or Cloudflare Tunnel / `cloudflared`
- [ ] Authenticated Origin Pulls (mTLS Cloudflare→origin) considered — record decision

## SEO cutover interaction (see `nginx-seo-rollback.md`)

- [ ] a Cloudflare cache purge is part of the cutover **and** the rollback steps (a cached WordPress page after cutover, or a cached Next page after rollback, defeats both)
- [ ] no Cloudflare Page Rule / redirect rule silently rewrites one of the 53 ranked URLs

## Evidence to close the blocker

A completed copy of this file with every row marked, committed to
`docs/runbooks/` (values that are secret — API tokens — described, not pasted),
plus the SSE and "API not cached" tests captured as terminal output.
