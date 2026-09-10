# Phase 6 — URL inventory

**Date:** 2 September 2026. **Method:** the real crawl
`docs/seo-baseline/20260826T084416Z.json` (63 live URLs, pulled from Yoast
sitemaps) + `docs/seo-baseline/phase6-wordpress-baseline.json` (this phase's
live re-probe) + `frontend/` route tree + `nginx/dunes-insolites.com.conf`.

**Production fronting:** `www.dunes-insolites.com` resolves to **Cloudflare**
(`server: cloudflare`, `cf-ray` present) → origin (WordPress + Yoast). The
Next.js app is **not deployed anywhere**. The repo's nginx split config is a
**draft** (3 open `TODO`s). See `phase6-nginx-seo.md` §3.

Ownership tags: `WORDPRESS` · `NEW APPLICATION` · `API` · `REDIRECT` · `UNKNOWN`.

---

## 1. Current live URL space (63 indexed URLs, all 200, all self-canonical)

| Bucket | Count | Stage-1 owner | Notes |
|---|---|---|---|
| Legacy product slugs (nuitee, bivouac, quad, sandboarding, bedouin-diner, soirees, pain-de-sabel) | 7 | **NEW APPLICATION** (served in place, URL unchanged) | `next.config.ts` rewrite; canonical stays the flat slug (`lib/legacySlugs.ts`) |
| `presentation-campement-dunes-insolites`, `dunes-insolites-camp-gallery` | 2 | **NEW APPLICATION** | rewritten to `/about`, `/gallery` — **canonical direction is a DECISION** (§4) |
| Legacy circuit URLs (Ksar Ghilane, Tataouine/Chenini, Douz-Matmata, 4x4, 2/3/4/6-day) | 13 | **REDIRECT** → `/circuits/` (301, CMS table) | Route Insolite product, not launched (Q6) |
| Near-duplicate "night in the desert" landings | 3 | **REDIRECT** → canonical product page (301) | 1 is EN → FR-slug (acceptable, same product) |
| WooCommerce/theme hub + account pages (`/services*`, `/mes-reservations`, `/mon-compte`, `/mot-de-passe-oublie`, `sabria-evasion`) | 8 | **REDIRECT** (301) | `/mes-reservations`, `/mon-compte`, `/mot-de-passe-oublie` → private/auth routes (not public canonicals) |
| Blog index + posts + informational | ~18 | **WORDPRESS** (nginx fallthrough) | not migrating in Stage 1 (ROADMAP: Sprint 5 / R2) |
| WordPress category archives (`/category/*`) | 6 | **WORDPRESS** | taxonomy internals, not in the SEO plan's 53 |
| Templately builder pages (`/?templately_library=…`) | 4 | **WORDPRESS** | theme internals; query-string variants of `/` |
| `/panier/`, `/review/`, `/detail-service/` | 3 | **UNKNOWN → WORDPRESS** | no destination decided — `DECISION_REQUIRED`, not guessed |
| `/` homepage | 1 | **NEW APPLICATION** | |

## 2. New application routes (not in the WordPress index — no ranking to lose)

`NEW APPLICATION`, all under `app/[locale]/(site)/`:
`/faq/`, `/guides/`, `/guides/[slug]/`, `/circuits/`, `/camp/`, `/camp/[slug]/`,
`/camp/[slug]/[accommodation]/`, `/activities/`, `/activities/[slug]/`,
`/about/`, `/gallery/`, `/contact/`, `/safety/`, `/legal/privacy/`,
`/legal/terms/`, plus the **locale-prefixed** variants `/{en,de,it,da,ar}/…`
(all 6 locales are in `app/sitemap.ts`).

`API`: `/api/**` (Next.js BFF → Spring backend on `127.0.0.1`).

Private / must-not-index (robots-disallowed, never in sitemap):
`/book/`, `/bookings/`, `/bookings/[id]/`, `/account/`, `/account/**`,
`/login/`, `/signup/`, `/forgot-password/`, `/reset-password/`,
`/verify-email/`.

**Phase 6 nginx fixes (DI-034):** the allowlist regex was missing `faq`,
`guides`, the auth routes, **and every locale prefix** — `scripts/nginx-coexistence-test.mjs`
showed `/faq/`, `/guides/*`, `/en/about/`, `/de/quad-desert/`, `/ar/faq/`
falling through to a WordPress 404. Added; none affects a ranked URL (baseline
crawl is 100 % unprefixed French, and `/faq` `/guides` 404 on WordPress today).

## 3. Per-ranked-URL detail (Stage 1 = nginx split deployed, WordPress still default)

`docs/seo/redirect-map.csv` is the row-per-URL source of truth. `docs/seo/url-contract.json`
is the machine-readable assertion set (`scripts/verify-production-urls.mjs`).
Shape:

| URL | Current owner | Stage-1 owner | Expected status | Expected canonical | hreflang | Redirect target | Rollback behaviour |
|---|---|---|---|---|---|---|---|
| `/nuitee-campement-desert/` | WordPress 200 | Next.js (rewrite) | 200 | self (`/nuitee-campement-desert/`) | fr + x-default | — | back to WordPress 200, same URL |
| `/quad-desert/` (+ 5 more product slugs) | WordPress 200 | Next.js (rewrite) | 200 | self | fr + x-default | — | WordPress 200, same URL |
| `/presentation-campement-dunes-insolites/` | WordPress 200 self-canon | Next.js (rewrite→/about) | 200 | **`/about/` today — DECISION** | fr + x-default | — | WordPress 200, same URL |
| `/ksar-ghilane-desert-tunisia/` (+ 12 circuit URLs) | WordPress 200 | Next.js | **301 → `/circuits/`** | `/circuits/` | n/a on the 301 | `/circuits/` | WordPress 200 (original circuit page) |
| `/nuit-desert-tunisien-dunes-insolites/` (+2) | WordPress 200 | Next.js | 301 → `/nuitee-campement-desert/` | product page | — | product page | WordPress 200 |
| `/services/` (+ 3 `/services/*`) | WordPress 200 | Next.js | 301 → `/activities/` \| `/camp/` \| `/circuits/` | target page | — | see redirect-map | WordPress 200 |
| `/mon-compte/` `/mes-reservations/` `/mot-de-passe-oublie/` | WordPress 200 | Next.js | 301 → `/account/` \| `/bookings/` \| `/login/` | **none — private, robots-disallowed** | — | private route | WordPress 200 |
| `/dunes-insolites-sabria-evasion-sahara/` | WordPress 200 | Next.js | 301 → `/about/` | `/about/` | — | `/about/` | WordPress 200 |
| `/blog-desert/`, `/blog-sahara-tunisie/`, ~16 posts, `/category/*` | WordPress 200 | **WordPress** (fallthrough) | 200 | self, unchanged | none (WP is FR-only) | — | unchanged |
| `/panier/` `/review/` `/detail-service/` | WordPress 200 | **WordPress** (fallthrough) | 200 | self | — | **DECISION_REQUIRED** | unchanged |
| `/` | WordPress 200 self-canon | Next.js | 200 | `/` | all 6 + x-default | — | WordPress 200 |
| `/sitemap.xml` | WordPress **301 → `/sitemap_index.xml`** | Next.js | **200** (Next serves it) | — | — | — | WordPress 301 → sitemap_index |
| `/robots.txt` | WordPress 200 (`Disallow:` empty) | Next.js 200 (disallows `/api/ /book /bookings/`) | 200 | — | — | — | WordPress robots.txt |
| `http://…` (either host) | 301 → https | 301 → https | 301 | — | — | https | unchanged (Cloudflare) |
| `https://dunes-insolites.com/` | 301 → www | 301 → www | 301 | — | — | www | unchanged |
| any nonexistent path | WordPress 404 | Next.js 404 (translated) OR WordPress 404 | 404 | — | — | — | WordPress 404 |

## 4. DECISION_REQUIRED items (do not resolve without the site owner)

| # | Item | Why it's a decision |
|---|---|---|
| D-1 | `/presentation-campement-dunes-insolites/` and `/dunes-insolites-camp-gallery/` — canonical to `/about/` / `/gallery/` (consolidate) **or** keep the legacy slug self-canonical (add to `lib/legacySlugs.ts`)? | Both are ranked FR URLs. The 7 product slugs deliberately keep the flat URL canonical; these 2 don't, so today they serve 200 while pointing equity at a different URL — a soft-consolidation Google may or may not honour. Either choice is defensible; it must be chosen, not defaulted. |
| D-2 | `/panier/`, `/review/`, `/detail-service/` — redirect target, or leave on WordPress indefinitely? | No equivalent page exists; inventing one is forbidden. Check backlinks/Search-Console impressions before deciding. |
| D-3 | `/mot-de-passe-oublie/` → the CMS redirect points at `/login/`; the app's real reset page is `/forgot-password/`. Confirm the intended target. | Small, but a redirect to the "wrong" auth page is a papercut for a ranked URL. |
| D-4 | Cloudflare's role in the cutover (see `phase6-nginx-seo.md` §3 / §10). | Infra-ownership decision — where the WP/Next split actually happens (origin nginx vs Cloudflare rules), and whether the origin nginx config in this repo is even the live one. |
| D-5 | `spend-a-night-…-camp` (EN) → `/nuitee-campement-desert/` (FR slug). Acceptable, or should EN keep its own path? | Language switch on a 301. Same product, so likely fine, but a call to make. |
