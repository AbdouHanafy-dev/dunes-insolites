# SEO baseline archive (DI-005)

Evidence of what the legacy WordPress site looked like to Google **before**
the Next.js migration, so a post-cutover crawl (DI-033) has something to diff
against, and a ranking drop can be pinned to a specific URL rather than
argued about.

## Crawl archive

`node scripts/seo-baseline-crawl.mjs > docs/seo-baseline/<timestamp>.json`

Pulls the URL list live from `www.dunes-insolites.com`'s own Yoast sitemaps
(not a hand-typed list, so it reflects what's actually indexed today) and
records, per URL: HTTP status, redirect target, `<title>`, meta description,
canonical.

First run: **`20260826T084416Z.json`** — 63/63 URLs returned 200, none
broken, taken 26 Aug 2026. (63, not 53 - the sitemap includes a few
Templately builder pages and category archives beyond the 53 the SEO plan
counts as "indexed content"; harmless, kept for completeness.)

Re-run the same script after cutover and diff the two JSON files — any URL
whose status changed from 200 is exactly the regression DI-033's
post-cutover crawl exists to catch.

## Search Console export (manual — needs your Google account)

The crawl above proves what the *site* serves; it can't see what *Google
has indexed and how it's performing* — that only exists in Search Console.
Export before cutover:

1. https://search.google.com/search-console → select the
   `www.dunes-insolites.com` property.
2. **Performance** tab → date range: **last 16 months** → Export → download
   as CSV (Queries, Pages, Countries, Devices — all four tables).
3. **Coverage / Pages** tab → export the indexed/excluded URL lists.
4. **Links** tab → export external + internal links.
5. **Sitemaps** tab → screenshot or note which sitemaps are currently
   submitted and their last-read status.
6. Save everything under `docs/seo-baseline/search-console-<date>/`.

Do this **before** DNS or hosting changes — Search Console's history is tied
to the verified property, and a property swap or a long outage can gap the
data you're trying to preserve.
