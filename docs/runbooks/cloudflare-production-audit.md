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

- [x] `VERIFIED (2026-10-01, Codex)` — SSL/TLS mode is **Full (strict)**.
- [x] `VERIFIED (2026-10-01, Codex)` — origin certificate validation succeeded
  for both `www` and the apex hostname.
- [x] `VERIFIED (2026-10-01, Codex)` — minimum TLS 1.2; TLS 1.3 enabled.
- [x] `VERIFIED (2026-10-01, Codex)` — **Always Use HTTPS** and
  **Automatic HTTPS Rewrites** are on.
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

- [x] `VERIFIED (2026-10-01, Codex)` — Brotli is on.
- [ ] SSE (`text/event-stream`) passes through unbuffered — test `curl -N https://www.dunes-insolites.com/api/notifications/subscribe?access_token=...` shows events streaming, not a hang then a dump
- [ ] WebSocket support on (not currently used, but confirm it is not actively blocked)

## Limits

- [ ] max upload body size ≥ the media-upload limit (8 MB) — Cloudflare Free caps at 100 MB, fine; confirm no lower Page Rule
- [ ] proxy read timeout ≥ the longest legitimate API call (invoice PDF / report generation)

## Security

- [x] `VERIFIED (2026-10-01, Codex)` — Free plan with Cloudflare Free Managed
  Ruleset plus custom blocking for sensitive paths and common admin probes.
- [x] `VERIFIED (2026-10-01, Codex)` — the single Free-plan rate limiting rule
  covers auth, contact, subscription and booking write paths at 10 requests per
  10 seconds per IP, followed by a 10-second mitigation. Origin limits remain
  the slower defence layer.
- [ ] Bot Fight Mode / bot management: confirm it does **not** block the legitimate booking POST or the Googlebot crawl of ranked URLs
- [ ] security headers: decide whether Cloudflare or the origin owns CSP/`X-Frame-Options`/`Referrer-Policy` (pick one; the Next apps can set them) — record which
- [x] `VERIFIED (2026-10-01, Codex)` — Development Mode is off.

## Origin protection

- [x] `VERIFIED (2026-10-01, Codex)` — the canonical customer HTTPS vhost
  allows Cloudflare's published IP ranges and localhost only. External evidence:
  the proxied URL returned 200 while direct resolution to `79.143.185.33`
  returned 403. API/admin/auth vhosts remain outside this customer-site rule.
- [ ] Authenticated Origin Pulls (mTLS Cloudflare→origin) considered — record decision

## SEO cutover interaction (see `nginx-seo-rollback.md`)

- [ ] a Cloudflare cache purge is part of the cutover **and** the rollback steps (a cached WordPress page after cutover, or a cached Next page after rollback, defeats both)
- [ ] no Cloudflare Page Rule / redirect rule silently rewrites one of the 53 ranked URLs

## Evidence to close the blocker

A completed copy of this file with every row marked, committed to
`docs/runbooks/` (values that are secret — API tokens — described, not pasted),
plus the SSE and "API not cached" tests captured as terminal output.
