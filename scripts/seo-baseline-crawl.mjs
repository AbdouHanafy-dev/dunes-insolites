#!/usr/bin/env node
// DI-005 - archive the legacy WordPress site's indexed state before the
// SEO migration (see docs/ROADMAP.md Sprint 0, docs/SEO_PLAN.pdf).
//
// Pulls the URL list straight from the live site's own Yoast sitemaps
// (rather than a hand-copied list) so the baseline reflects exactly what
// Google has indexed today, then records status, redirect target, title,
// meta description and canonical for each one. Run again after cutover and
// diff against this file to catch anything that silently changed.
//
// Usage: node scripts/seo-baseline-crawl.mjs

const ORIGIN = "https://www.dunes-insolites.com";
const SITEMAP_INDEX = `${ORIGIN}/sitemap.xml`;
const CONCURRENCY = 5;
const TIMEOUT_MS = 15000;

async function fetchText(url) {
  // Follows redirects here (sitemap discovery only) - Yoast's sitemap index
  // itself 301s in some configs, and we still want the sub-sitemap contents.
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { res, body: res.status < 400 ? await res.text() : "" };
}

async function discoverUrls() {
  const { body: indexXml } = await fetchText(SITEMAP_INDEX);
  const subSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const urls = new Set();
  for (const sitemapUrl of subSitemaps) {
    if (sitemapUrl.includes("author-sitemap")) continue; // not real content
    const { res, body } = await fetchText(sitemapUrl);
    if (res.status >= 400) continue;
    for (const m of body.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
  }
  return [...urls].sort();
}

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

async function crawlOne(url) {
  const record = { url, status: null, redirectTo: null, title: null, metaDescription: null, canonical: null, error: null };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual" });
    record.status = res.status;
    if (res.status >= 300 && res.status < 400) {
      record.redirectTo = res.headers.get("location");
      return record;
    }
    const html = await res.text();
    record.title = extract(html, /<title[^>]*>([^<]*)<\/title>/i);
    record.metaDescription = extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    record.canonical = extract(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  } catch (err) {
    record.error = err.message;
  }
  return record;
}

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: size }, run));
  return results;
}

const urls = await discoverUrls();
console.error(`Discovered ${urls.length} URLs from live sitemaps. Crawling...`);
const records = await pool(urls, CONCURRENCY, crawlOne);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const okCount = records.filter((r) => r.status === 200).length;
const brokenCount = records.filter((r) => r.status === null || r.status >= 400).length;

const summary = {
  crawledAt: new Date().toISOString(),
  origin: ORIGIN,
  totalUrls: records.length,
  status200: okCount,
  broken: brokenCount,
  records,
};

console.log(JSON.stringify(summary, null, 2));
console.error(`\nDone. ${okCount}/${records.length} returned 200, ${brokenCount} broken.`);
console.error(`Suggested filename: docs/seo-baseline/${timestamp}.json`);
