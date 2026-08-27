/**
 * Slugs that carry a real WordPress ranking (docs/SEO_PLAN.pdf's "Legacy
 * URL map") and must therefore be served — and canonicalized — at a flat
 * top-level URL, not this app's nested /activities or /camp routes.
 *
 * The strongest migration is one where the URL does not change (CLAUDE.md),
 * so for these slugs the flat legacy path is the canonical one; the nested
 * route still renders the page (next.config.ts rewrites the flat URL to
 * it), it just isn't what Google should index. Any slug not in this set
 * (camel-trek, the accommodation sub-pages) has no competing legacy URL, so
 * its own nested path stays canonical as normal.
 *
 * Single source of truth for three call sites that all need to agree:
 * next.config.ts's rewrites, the canonical tag in each detail page's
 * generateMetadata, and app/sitemap.ts.
 */
export const LEGACY_STAY_SLUGS = ["nuitee-campement-desert", "bivouac-desert-tunisie"];

export const LEGACY_ACTIVITY_SLUGS = [
  "sandboarding-desert",
  "quad-desert",
  "bedouin-diner-sahara-tunisien",
  "soirees-sous-les-etoiles",
  "le-pain-de-sabel",
];

export const LEGACY_PRODUCT_SLUGS = new Set([...LEGACY_STAY_SLUGS, ...LEGACY_ACTIVITY_SLUGS]);

// French is the default, unprefixed locale (i18n/routing.ts). The flat
// legacy WordPress URL only ever existed in French, so it's only canonical
// for the French version of a legacy-slugged page - every other locale
// falls back to that locale's own nested, prefixed path since there's no
// competing legacy URL to preserve for it.
const DEFAULT_LOCALE = "fr";

export function canonicalActivityPath(slug: string, locale: string): string {
  if (locale === DEFAULT_LOCALE && LEGACY_PRODUCT_SLUGS.has(slug)) return `/${slug}`;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return `${prefix}/activities/${slug}`;
}

export function canonicalStayPath(slug: string, locale: string): string {
  if (locale === DEFAULT_LOCALE && LEGACY_PRODUCT_SLUGS.has(slug)) return `/${slug}`;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return `${prefix}/camp/${slug}`;
}
