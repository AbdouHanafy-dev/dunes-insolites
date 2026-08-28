/**
 * Crawls the vitrine's own real pages — every URL the Sitemap overview
 * already reads (admin/lib/sitemap.ts) — and checks the actual rendered
 * <title>/<meta description>/<link rel="canonical"> of each one. Unlike
 * Pages SEO (which only sees what an editor typed into the CMS form),
 * this sees what a visitor's browser and a search engine crawler actually
 * receive, catalogue pages included — the trailing-slash mismatch between
 * app/sitemap.ts and every page's real canonical tag was found exactly
 * this way, by building this feature.
 *
 * Cached 30 minutes per URL (`next: { revalidate }`) so opening this page
 * doesn't hammer the public site on every admin visit.
 */
import { getSitemapEntries } from "./sitemap";

const FRONTEND_BASE = (process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const REVALIDATE_SECONDS = 1800;
const CONCURRENCY = 8;

export type AuditEntry = {
  loc: string;
  ok: boolean;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsNoindex: boolean;
};

function extract(html: string): Omit<AuditEntry, "loc" | "ok"> {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? null;
  const metaDescription =
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1]?.trim() ?? null;
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] ?? null;
  const robotsNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/.test(html);
  return { title, metaDescription, canonical, robotsNoindex };
}

async function fetchOne(loc: string): Promise<AuditEntry> {
  let pathname: string;
  try {
    pathname = new URL(loc).pathname;
  } catch {
    return { loc, ok: false, title: null, metaDescription: null, canonical: null, robotsNoindex: false };
  }

  try {
    const res = await fetch(`${FRONTEND_BASE}${pathname}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      return { loc, ok: false, title: null, metaDescription: null, canonical: null, robotsNoindex: false };
    }
    const html = await res.text();
    return { loc, ok: true, ...extract(html) };
  } catch {
    return { loc, ok: false, title: null, metaDescription: null, canonical: null, robotsNoindex: false };
  }
}

/** Empty array if the sitemap itself can't be read — same fail-quiet
 * convention as getSitemapEntries(). */
export async function getSeoAudit(): Promise<AuditEntry[]> {
  const sitemapEntries = await getSitemapEntries();
  const results: AuditEntry[] = [];

  for (let i = 0; i < sitemapEntries.length; i += CONCURRENCY) {
    const batch = sitemapEntries.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(batch.map((e) => fetchOne(e.loc)));
    results.push(...settled);
  }

  return results;
}
