/**
 * Fetches and parses the vitrine's own live sitemap.xml — not a rebuilt
 * copy of frontend/app/sitemap.ts's logic, the actual generated file, so
 * this can never drift from what Google receives. Deliberately not part
 * of lib/api.ts (that module's own doc comment: "the single seam to the
 * Spring Boot backend" — this talks to the frontend app instead, same
 * FRONTEND_BASE convention as components/pages/LivePreviewPane.tsx).
 */
const FRONTEND_BASE = (process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

export type SitemapEntry = {
  loc: string;
  changefreq: string | null;
  priority: number | null;
  hreflangs: string[];
};

function parseSitemapXml(xml: string): SitemapEntry[] {
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  return blocks.map((block) => {
    const loc = block.match(/<loc>([^<]*)<\/loc>/)?.[1] ?? "";
    const changefreq = block.match(/<changefreq>([^<]*)<\/changefreq>/)?.[1] ?? null;
    const priorityStr = block.match(/<priority>([^<]*)<\/priority>/)?.[1];
    const priority = priorityStr ? Number(priorityStr) : null;
    const hreflangs = [...block.matchAll(/hreflang="([^"]*)"/g)].map((m) => m[1]);
    return { loc, changefreq, priority, hreflangs };
  });
}

/** Empty array on any failure (frontend not running, network error, ...) — a
 * read-only overview should degrade quietly, never crash the backoffice. */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${FRONTEND_BASE}/sitemap.xml`, { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseSitemapXml(xml);
  } catch {
    return [];
  }
}

/**
 * Every real, currently-published page path (locale-prefixed where
 * applicable), relative — `/camp/nuitee-campement-desert/`, not the full
 * `https://www.dunes-insolites.com/...` `loc`. `site.url` is hardcoded to
 * the real production domain even in local dev (frontend/lib/site.ts), so
 * this strips whatever origin comes back rather than assuming one -
 * correct in dev and in production alike. Used by the maintenance-window
 * editor's page picker (components/crud/MaintenanceCrud.tsx) so a window
 * can only ever target a path that genuinely exists, never a typo.
 */
export async function getSitemapPaths(): Promise<string[]> {
  const entries = await getSitemapEntries();
  const paths = entries
    .map((e) => {
      try {
        return new URL(e.loc).pathname;
      } catch {
        return null;
      }
    })
    .filter((p): p is string => p !== null);
  return [...new Set(paths)].sort();
}
