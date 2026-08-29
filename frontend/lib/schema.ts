import { site } from "@/lib/site";

// next.config.ts sets trailingSlash: true, so every URL this app actually
// serves ends in "/" (the homepage included). Shared with app/sitemap.ts,
// which had its own copy of exactly this - moved here as the one place
// both need it, rather than two copies that can drift.
export function withTrailingSlash(path: string): string {
  return path === "" || path.endsWith("/") ? path || "/" : `${path}/`;
}

/**
 * BreadcrumbList JSON-LD (DI-026/SEO-07) — flagged MISSING in
 * docs/SEO_PLAN.pdf's technical audit. `items` are site-relative paths;
 * this resolves them against `site.url` (and trailing-slashes them - found
 * live, SEO audit: every existing call site's non-homepage entries were
 * missing it, disagreeing with that same page's own canonical tag by
 * exactly a trailing slash) so every entry is absolute, which schema.org's
 * BreadcrumbList requires.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${withTrailingSlash(item.path)}`,
    })),
  };
}
