import { site } from "@/lib/site";

/**
 * BreadcrumbList JSON-LD (DI-026/SEO-07) — flagged MISSING in
 * docs/SEO_PLAN.pdf's technical audit. `items` are site-relative paths;
 * this resolves them against `site.url` so every entry is absolute, which
 * schema.org's BreadcrumbList requires.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}
