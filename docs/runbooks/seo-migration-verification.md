# Runbook — SEO migration verification

How to check, at any point in the WordPress → Next.js strangler migration, that
no ranked URL has regressed. Companion to `nginx-seo-rollback.md`.

---

## The three tools

| Tool | What it checks | Needs |
|---|---|---|
| `scripts/verify-production-urls.mjs` (`npm run verify:seo`) | HTTP status, redirect hops (loop/chain), canonical, hreflang, robots.txt, sitemap contents — for a live host, against `docs/seo/url-contract.json` | a reachable host (`BASE_URL`) |
| `scripts/nginx-coexistence-test.mjs` (`npm run verify:seo:coexistence`) | the **real repo nginx config** routes WP URLs → WordPress and new URLs → Next.js, and a new route can't steal a ranked URL | Docker + a Next.js server on `:3000` |
| `frontend/lib/seo-contract.test.ts` (in `npm run test:web`) | offline: canonical strategy, hreflang reciprocity, `withTrailingSlash`, redirect-map has no loops/chains/homepage-301s, nginx allowlist ⊇ `lib/legacySlugs.ts` | nothing (CI-safe) |
| `scripts/seo-baseline-crawl.mjs` | full crawl of the live Yoast sitemap → JSON, for diffing before/after cutover | live host |

---

## Before any Stage-1 deploy

1. **Re-archive the baseline** (the last one is 30 Aug):
   ```bash
   node scripts/seo-baseline-crawl.mjs > docs/seo-baseline/$(date -u +%Y%m%dT%H%M%SZ).json
   ```
2. **Snapshot the WordPress contract**:
   ```bash
   BASE_URL=https://www.dunes-insolites.com SEO_PROFILE=wordpress \
     SEO_JSON_OUT=docs/seo-baseline/phase6-wordpress-baseline.json \
     npm run verify:seo
   ```
   Expect **0 failed**. This is the "known good" to compare against.
3. **Screenshot Cloudflare** — Rules, Page Rules, Redirect Rules, Caching config,
   "Always Use HTTPS", SSL/TLS mode. Save under `docs/seo-baseline/cloudflare-<date>/`.
4. **Export Search Console** — Performance (16 months), Coverage, Links, Sitemaps
   (see `docs/seo-baseline/README.md` §"Search Console export").
5. **Seed the CMS Redirect table** on the target backend:
   ```bash
   python scripts/seed-legacy-redirects.py       # 25 rows; not idempotent (409s on re-run)
   ```
6. **Fill the 3 nginx `TODO`s** and `nginx -t` **on the server**.
7. **Run the coexistence test** with the final allowlist:
   ```bash
   ALLOW_SEED_FALLBACK=true npm run start --workspace frontend &   # or dev
   npm run verify:seo:coexistence                                   # expect PASS
   ```

## Immediately after Stage 1

Point the checker at production with the **Next.js** profile:
```bash
BASE_URL=https://www.dunes-insolites.com SEO_PROFILE=nextjs \
  SEO_THROUGH_NGINX=1 SEO_CMS_REDIRECTS=1 npm run verify:seo
```
`SEO_THROUGH_NGINX=1` enables the "blog/informational STAYS WordPress" and
"unmapped legacy" groups; `SEO_CMS_REDIRECTS=1` enables the CMS 301 groups.
**Any failure = candidate for rollback** (`nginx-seo-rollback.md`).

Then a full crawl + diff:
```bash
node scripts/seo-baseline-crawl.mjs > docs/seo-baseline/post-cutover-$(date -u +%Y%m%dT%H%M%SZ).json
# diff the "records[].status" against the pre-cutover file — any 200 -> non-200 is the regression
```

## The SEO safety checklist (what `verify:seo` asserts, and what it can't)

| Check | Automated? |
|---|---|
| ranked URL returns 200 (or the intended 301) | ✅ |
| no redirect loop | ✅ |
| no redirect chain beyond `maxHops` | ✅ |
| 301 (not 302) for permanent moves | ✅ (contract asserts `status: 301`) |
| no homepage catch-all 301 | ✅ (offline test on redirect-map) + ✅ (live: destinations asserted) |
| canonical is self, https, correct host | ✅ |
| redirected URL does not self-canonical | ✅ (it 301s before a body is fetched) |
| canonical not pointing to another domain / http / wrong www | ✅ |
| hreflang: every locale + `x-default` present | ✅ |
| hreflang: alternates absolute-https | ✅ |
| hreflang: reciprocal | ✅ offline (`localeAlternates`) |
| trailing-slash: `/x` → `/x/` (one hop) | ✅ |
| robots.txt: reachable, disallows `/api/ /book /bookings/`, not `/` | ✅ |
| robots.txt: Sitemap directive correct | ✅ |
| sitemap.xml: reachable, XML | ✅ |
| sitemap: every URL 200, self-canonical, no redirect | ✅ (samples up to 25) |
| sitemap: no `/api/`, `/book/`, `/account/`, localhost, `?`, `/admin` | ✅ |
| accidental `noindex` on a 200 page | ✅ |
| **Cloudflare cache masking a redirect during a drill** | ❌ — purge manually (rollback step 6) |
| **Search Console index coverage / actual ranking movement** | ❌ — only visible in Search Console, days later |
| **the server's live nginx config == the repo config** | ❌ — needs server access |
