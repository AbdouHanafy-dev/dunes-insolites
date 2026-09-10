# PHASE 6 — FINAL REPORT

## 1. Scope

Verification and reversible infrastructure for the WordPress → Next.js
**strangler** migration. **No migration was performed.** No ranked URL moved,
no WordPress page changed, no DNS change, no deploy, no Cloudflare change, no
secret touched. Deliverables: a URL inventory, a deterministic redirect map, an
automated URL response-contract checker (run read-only against the **real
production host**), a local nginx coexistence test, offline SEO regression
tests, a rollback runbook, and a verification runbook. Two small, additive,
reversible fixes were made to `nginx/dunes-insolites.com.conf` (see §3).

## 2. Current URL Architecture

```
DNS ──▶ Cloudflare (proxied: server: cloudflare, cf-ray)
          │  "Always Use HTTPS"; HTML is cf-cache-status: DYNAMIC (not edge-cached)
          ▼
       origin host ──▶ WordPress + Yoast SEO          [100% of traffic today]
                    └▶ Next.js                          [NOT DEPLOYED anywhere]
```

- **`www.dunes-insolites.com` is behind Cloudflare.** Every repo doc says "nginx
  is the sole ingress" — that is incomplete. Verified this phase.
- 63 indexed URLs (Yoast sitemaps), all 200, all self-canonical, `index,follow`,
  no hreflang (WordPress is French-only). Re-confirmed live 2 Sep 2026.
- `http://` → 301 `https://`. `https://dunes-insolites.com/` → 301
  `https://www.dunes-insolites.com/`. `/x` → 301 `/x/` (trailing slash enforced,
  matches Next's `trailingSlash: true`).
- `/sitemap.xml` → **301 → `/sitemap_index.xml`** (Yoast). The Next.js app serves
  `/sitemap.xml` directly (200) — a change to document at cutover, not a
  regression.
- `robots.txt`: `Disallow:` (empty) + `Sitemap: …/sitemap_index.xml`.
- The Next.js app: 6 locales, `localePrefix: "as-needed"` (FR unprefixed).
  Legacy slugs handled 3 ways — `next.config.ts` **rewrites** (7 product slugs +
  `/about` + `/gallery`, all locales, URL unchanged), CMS **Redirect table** via
  `middleware.ts` (25 rows, `scripts/seed-legacy-redirects.py`), and the nginx
  **allowlist** (WordPress is the default; only Next's paths are allowlisted).

Full inventory: `docs/reports/phase6-url-inventory.md`.

## 3. nginx Audit

`nginx/dunes-insolites.com.conf` — reviewed in full.

**Sound by design:**
- WordPress is the **default** (`location / { proxy_pass http://wordpress; }` is
  last). An un-anticipated URL fails safe to the site that has always served it,
  never to a Next 404. This is the correct strangler direction.
- No dangerous top-level `location / { proxy_pass next; }`.
- `/_next/`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`
  pinned to Next.
- HTTP→HTTPS `server` block returns a single 301 to the canonical host.
- Verified in a real `nginx:stable` container (`nginx -t` + routing) — 29 Aug and
  again this phase.

**Findings + fixes (small, additive, reversible — DI-034):**
| # | Finding | Fix |
|---|---|---|
| F-1 | `/faq/` and `/guides/*` are real Next routes (in `app/sitemap.ts`) but were **not in the allowlist** → would fall through to a WordPress 404. `scripts/nginx-coexistence-test.mjs` caught it. | Added `faq`, `guides` (and the auth routes `forgot-password`, `reset-password`, `verify-email`) to the native-routes regex. |
| F-2 | **No locale-prefix handling at all.** `/en/*`, `/de/*`, `/it/*`, `/da/*`, `/ar/*` — every non-French route, all in the sitemap — fell through to WordPress. | Added `location ~ ^/(en|de|it|da|ar)(/|$)` → `next_app`. |
| — | Both fixes touch **zero ranked URLs**: the baseline crawl is 100 % unprefixed French, and `/faq` `/guides` 404 on WordPress today. |

**Open `TODO`s (need the server — launch blockers for Phase 7, not Phase 6):**
`next_app` upstream host/port, `wordpress` upstream host/port, TLS certificate
paths. Plus: **the repo cannot confirm this file is the live origin config** (D-4).

**Not changed** (deliberately, per phase rules): the DI-024 redirect allowlist
block (works — routes circuit URLs to Next for the CMS 301), WordPress exposure
of `/wp-login.php` / `/wp-json/` (still served by WP under the strangler; harden
at decommission), and the overall two-upstream architecture.

## 4. Redirect Map

`docs/seo/redirect-map.csv` — 1 row per URL, columns: `source, expected_status,
destination, owner, reason, canonical_after_redirect, language, rollback_target,
notes`. Built from the real crawl + `seed-legacy-redirects.py` + `next.config.ts`.

- 7 product slugs: `200` served-in-place (URL & canonical unchanged).
- 13 circuit URLs → `301 /circuits/` (never homepage — asserted).
- 3 duplicate landings → `301` to the canonical product page.
- 8 hub/account URLs → `301` (3 to private/auth routes — flagged as non-canonical).
- ~24 blog/informational/category → **stay WordPress** (no redirect).
- `/panier/`, `/review/`, `/detail-service/` → `DECISION_REQUIRED` (not guessed).
- No redirect chains authored; no loops; no query-string drops; trailing-slash
  policy on every source. Offline-tested (§8).

## 5. Canonical Verification

| Check | Result |
|---|---|
| Every ranked WordPress URL self-canonical, https, `www` host | **VERIFIED AGAINST REAL HOST** (60/60) |
| Next.js `metadataBase` = `https://www.dunes-insolites.com` (canonical never localhost/http/bare-domain) | **VERIFIED LOCALLY** (`lib/site.ts`, contract test, local `next start`) |
| 7 legacy product slugs stay self-canonical after the rewrite | **VERIFIED LOCALLY** (`SEO_PROFILE=nextjs` against `next start`) |
| Redirected URL never presents itself as canonical | **VERIFIED** (301 fires before any body) |
| `/presentation-campement-dunes-insolites/` & `/dunes-insolites-camp-gallery/` canonical to `/about/` & `/gallery/` (cross-URL canonical on a ranked page) | **VERIFIED LOCALLY — flagged as DECISION D-1** |
| Canonical to another domain / http / wrong-www | **VERIFIED LOCALLY — none** |

## 6. hreflang Verification

| Check | Result |
|---|---|
| Homepage emits all 6 locales + `x-default` | **VERIFIED LOCALLY** |
| `x-default` = the French (default, unprefixed) path | **VERIFIED LOCALLY** (`localeAlternates`, offline test) |
| Reciprocal (canonical for a locale == that locale's own alternate) | **VERIFIED LOCALLY** (offline test, all 6 locales) |
| Alternates are absolute `https://` | **VERIFIED LOCALLY** |
| No alternate points at a 404 / unintended redirect | **VERIFIED LOCALLY** for the pages `next start` could serve; needs staging for catalogue pages |
| WordPress has no hreflang (FR-only) → Next adding it is an addition, not a regression | **VERIFIED AGAINST REAL HOST** |

## 7. Sitemap / robots Verification

| Check | Result |
|---|---|
| WordPress `robots.txt` reachable, correct `Sitemap:` | **VERIFIED AGAINST REAL HOST** |
| Next `robots.ts` disallows `/api/`, `/book`, `/bookings/`; not `/`; `Sitemap: {site.url}/sitemap.xml` | **VERIFIED LOCALLY** (offline test + local `next start` 200) |
| WordPress `/sitemap.xml` → 301 `/sitemap_index.xml` | **VERIFIED AGAINST REAL HOST** |
| Next `/sitemap.xml` → 200 XML | **VERIFIED LOCALLY** |
| Sitemap contains no `/api/`, `/book/`, `/account/`, `/login/`, `/admin`, localhost, query strings | **VERIFIED LOCALLY** (offline test on `sitemap.ts` static list + `verify:seo` sitemap crawl) |
| Sitemap: every entry 200 + self-canonical + no redirect | **NOT VERIFIED** — needs a staging Next.js with a real catalogue (local seed data 404s some `<loc>`s; the check is implemented and runs) |

## 8. Automated URL Test

**`scripts/verify-production-urls.mjs`** (`npm run verify:seo`):
- `BASE_URL` required (no silent localhost default). `SEO_PROFILE=wordpress|nextjs`.
  `SEO_THROUGH_NGINX=1` / `SEO_CMS_REDIRECTS=1` gate the infra/data-dependent groups.
- Per URL: full redirect hop chain, **loop detection**, **chain-length** check,
  status, `Location`, canonical (self / https / host), hreflang (present +
  absolute), meta-`robots` `noindex`-on-200. Plus `robots.txt` (reachable,
  Disallow rules) and `sitemap.xml` (status, XML, sampled entry crawl, forbidden
  fragments). Machine-readable `SEO_JSON_OUT`. **Exit non-zero on any failure.**
- Contract: `docs/seo/url-contract.json` — 15 URL groups + robots + sitemap,
  covering ranked WP URLs (FR product/circuit/hub/blog), new app routes,
  locale-prefixed, trailing-slash, http→https, non-www→www, and negatives
  (nonexistent, private, API).

**`scripts/nginx-coexistence-test.mjs`** (`npm run verify:seo:coexistence`):
runs the **real repo nginx config** in a throwaway container against a live
Next.js `:3000` and a WordPress stub; asserts each routing category and the
load-bearing property "a new Next route cannot intercept an un-allowlisted WP
URL." **16/16 PASS** this phase (after the §3 fixes).

**`frontend/lib/seo-contract.test.ts`** (in `npm run test:web` / CI): 24 offline
tests — canonical strategy, hreflang reciprocity, `withTrailingSlash`,
robots/sitemap source, redirect-map validity (no loop/chain/dupe/homepage-301,
trailing-slash policy), url-contract well-formed, nginx allowlist ⊇
`lib/legacySlugs.ts` and WordPress-default preserved.

## 9. WordPress / Next.js Coexistence

Proven locally (`nginx-coexistence-test.mjs`, Docker, real config):

| Request | Routed to | ✓ |
|---|---|---|
| `/blog-desert/`, `/category/sabria/`, `/blog-sahara-tunisie/`, `/are-there-any-deserts-in-tunisia/` | WordPress | ✓ |
| `/panier/` (unmapped) | WordPress (fail-safe) | ✓ |
| `/nuitee-campement-desert/` (legacy product) | Next.js, 200 | ✓ |
| `/faq/`, `/en/about/`, `/de/quad-desert/`, `/ar/faq/` | Next.js (after §3 fix) | ✓ |
| `/ksar-ghilane-desert-tunisia/` (DI-024 circuit) | Next.js (for the CMS 301) | ✓ |
| `/api/health` | Next.js BFF, never WordPress | ✓ |
| `/`, `/_next/*`, `/robots.txt`, `/sitemap.xml` | Next.js | ✓ |
| **adding a Next route cannot steal an un-allowlisted WP URL** | proven | ✓ |

## 10. Rollback Design

`docs/runbooks/nginx-seo-rollback.md`. Mechanism: deploy the split as an
**nginx include behind a symlink**; rollback is one `ln -sfn` + `nginx -t` +
`systemctl reload` (zero downtime), then Cloudflare cache purge + `npm run
verify:seo` (wordpress profile). WordPress is never touched — rollback only
removes the Next allowlist. **Target: < 15 min to recover.** 13-step procedure
covering syntax-validate → reload → Cloudflare purge → smoke-test → ranked-URL
check → regressed-URL check → booking/301/canonical checks → log the result.

## 11. Rollback Drill

**NOT EXECUTED against the real host** — this environment has read-only HTTP
access to `www.dunes-insolites.com` but **no shell/SSH to the origin**, and the
Next.js app is not deployed, so there is nothing to roll back *from* yet.

**Reproduced locally instead:** the config swap + `nginx -t` + routing
verification is exactly what `nginx-coexistence-test.mjs` exercises (bring the
split config up in a container, prove routing, tear down). The "switch back to
WordPress-only" half is the trivial inverse (drop the allowlist blocks →
everything hits `location /` → wordpress).

Outstanding (Phase 7): a real drill against a staging origin (or a
maintenance-window drill on production) with `verify:seo` before/after, logged to
`docs/seo-baseline/rollback-drills.md`.

## 12. Tests Executed

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run test:web` | **PASS** — frontend 36 (12 + **24 new** `seo-contract`), admin 13 |
| `npm run backend:test:unit` | **PASS** — 56 |
| `npm run validate:prod-config` | **PASS** — 26/26 |
| `npm run verify` | **PASS** |
| `npm run backend:test:it` | see §18 (running; Phases 1–5 regression) |
| `npm run verify:seo` (`BASE_URL=https://www.dunes-insolites.com`, wordpress) | **PASS — 60/60 against the REAL host** |
| `npm run verify:seo` (`BASE_URL=http://localhost:3000`, nextjs) | **PASS — 40/40**, 5 groups skipped (need staging backend / nginx) |
| `npm run verify:seo:coexistence` (Docker + local `next start`) | **PASS — 16/16** |

## 13. Real Production Verification

**Done (read-only HTTP against `www.dunes-insolites.com`):**
- Cloudflare fronting confirmed.
- 60-check WordPress response contract: **0 failures** — every ranked URL 200 +
  self-canonical, trailing-slash enforced, http→https and non-www→www 301s,
  robots.txt + sitemap 301, 404 for nonexistent. Archived:
  `docs/seo-baseline/phase6-wordpress-baseline.json`.

**NOT done (no shell/SSH to the origin; Next.js not deployed):**
- Inspecting / reloading the server's actual nginx config.
- Confirming the repo config == the live origin config (**D-4**).
- Cloudflare Rules / Page Rules / cache config audit.
- A rollback drill on a real origin.
- `SEO_PROFILE=nextjs` against production (nothing to point at).

## 14. Files Changed

**New:**
- `scripts/verify-production-urls.mjs` — the URL contract checker
- `scripts/nginx-coexistence-test.mjs` — the local nginx routing proof
- `docs/seo/url-contract.json` — machine-readable expectations (wordpress + nextjs)
- `docs/seo/redirect-map.csv` — deterministic redirect map
- `frontend/lib/seo-contract.test.ts` — 24 offline SEO regression tests
- `docs/reports/phase6-url-inventory.md`
- `docs/reports/phase6-nginx-seo.md` (this file)
- `docs/runbooks/nginx-seo-rollback.md`
- `docs/runbooks/seo-migration-verification.md`
- `docs/seo-baseline/phase6-wordpress-baseline.json` — live baseline snapshot

**Modified:**
- `nginx/dunes-insolites.com.conf` — added `faq`, `guides`, auth routes, and a
  locale-prefix (`/en /de /it /da /ar`) allowlist block (DI-034). Additive;
  no ranked URL affected. `nginx -t` clean, coexistence test 16/16.
- `package.json` — `verify:seo`, `verify:seo:coexistence` scripts
- `.github/workflows/ci.yml` — note on the offline SEO tests; new optional
  `seo-live-canary` job (runs only if `vars.SEO_BASE_URL` is set;
  `continue-on-error`, never gates a merge; no secrets)
- `.gitignore` — `.nginx-coexist-*/`

No production secret, DNS record, WordPress page, or Cloudflare setting touched.
Nothing committed.

## 15. Remaining Risks

| # | Risk | Severity | Note |
|---|---|---|---|
| R-1 | Repo nginx config may not be the live origin config; 3 upstream/TLS `TODO`s unfilled | **P1 / launch blocker** | needs server access (D-4) |
| R-2 | Cloudflare layer undocumented — its redirect rules, cache config, SSL mode, and whether it participates in the WP/Next split are unknown | **P1 / launch blocker** | screenshot + audit before Stage 1 |
| R-3 | CMS Redirect table (25 rows) not verified against a live backend this phase; `middleware.ts` fail-open means a backend outage → **no 301 fires** (legacy circuit URLs would fall to the nginx allowlist → Next 404) | P2 | run `seed-legacy-redirects.py` + `verify:seo nextjs` on staging; consider baking the 25 known 301s into nginx as a backstop |
| R-4 | `http://dunes-insolites.com/` is a **2-hop** redirect (scheme upgrade keeps host, then www) | P3 | pre-existing, Cloudflare-side; add one Cloudflare redirect rule to collapse to 1 hop |
| R-5 | Rollback never executed on a real origin | P2 | Phase 7 drill |
| R-6 | `/sitemap.xml` changes from 301→sitemap_index (WP) to 200 (Next); Search Console has `sitemap_index.xml` submitted | P2 | keep `sitemap_index.xml` resolving (WP) until decommission; resubmit `/sitemap.xml` |
| R-7 | Sitemap entry-level verification (every `<loc>` 200 + self-canonical) not run against a real catalogue | P2 | run on staging |
| R-8 | `/wp-login.php`, `/wp-json/` reachable (WordPress) | P3 | strangler keeps them on WP; block at decommission |

## 16. Launch Blockers

1. **Fill the 3 nginx `TODO`s and confirm the live origin config** (R-1, D-4).
2. **Audit + document the Cloudflare layer** and decide where the split lives (R-2).
3. **Execute a real rollback drill** on a staging origin, logged (R-5).
4. **Verify the CMS 301s + `SEO_PROFILE=nextjs`** against a staging deploy with a
   seeded Redirect table and real catalogue (R-3, R-7).
5. Off-site DB backup (`OFFSITE_CMD`, pre-existing, ARCHITECTURE §13 #26) — not
   Phase 6 but on the same go/no-go list.

## 17. Production Readiness

| Question | Answer |
|---|---|
| Which URLs belong to WordPress? | **Answered** — `phase6-url-inventory.md` + `redirect-map.csv` |
| Which URLs can safely belong to the new app? | **Answered** — 7 product slugs (in place) + all new routes + all locale-prefixed |
| Are redirects correct? | **Contract + offline tests: yes. Live nextjs behaviour: NOT VERIFIED (no staging).** WordPress baseline: verified. |
| Are canonical URLs correct? | WordPress: **verified live**. Next.js: **verified locally**, with **D-1** flagged. |
| Are hreflang URLs correct? | **Verified locally** (reciprocal, x-default, absolute-https). Catalogue pages need staging. |
| Is trailing-slash deterministic? | **Yes** — `trailingSlash: true`; WP 301, Next 308; verified both. |
| Are 404/301/200 responses correct? | WordPress: **verified live**. Split routing: **verified locally** (coexistence 16/16). |
| Can nginx switch back to WordPress with one change? | **Yes by design** (symlink/include swap); **not executed on a real host**. |
| Has rollback actually been tested? | **Locally, yes. On the real production host, NO.** |
| Can an automated suite detect SEO breakage? | **Yes** — `verify:seo` (live), `verify:seo:coexistence` (routing), 24 offline tests (CI). |

## 18. Phase 7 Handoff

Phase 7 (staged strangler rollout) can start from:
- `docs/seo/redirect-map.csv` + `docs/seo/url-contract.json` as the spec.
- `npm run verify:seo` (wordpress profile) as the pre-cutover baseline gate —
  currently **green against production**.
- `npm run verify:seo:coexistence` as the pre-deploy routing gate — **green**.
- `docs/runbooks/nginx-seo-rollback.md` + `seo-migration-verification.md`.

Phase 7 must, before touching production: resolve **D-1…D-5** and the 5 launch
blockers in §16; run the nextjs-profile contract + a rollback drill on staging;
re-archive the SEO baseline; export Search Console; screenshot Cloudflare.

Phase 7 must **not** be started here — this phase's job was to make it safer, not
to execute it.

---

## PHASE 6 — PARTIALLY COMPLETE

**Complete:** URL inventory; deterministic redirect map; automated URL
response-contract checker (run green against the real production WordPress);
local nginx coexistence proof (green, incl. 2 real config bugs found and fixed);
24 offline SEO regression tests wired into CI; rollback runbook; verification
runbook; live WordPress baseline archived.

**Outstanding (needs production/infra access — Phase 7 launch blockers):**
real-server nginx inspection & `nginx -t`; confirmation the repo config is the
live one; Cloudflare configuration audit; a rollback drill on a real origin; the
`nextjs`-profile contract and CMS-301 verification against a staging deploy.
