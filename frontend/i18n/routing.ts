import { defineRouting } from "next-intl/routing";

/**
 * French is the default locale at the root — unprefixed — matching the
 * already-established SEO work this session: the DI-022 legacy-slug
 * rewrites, their canonical tags, and the sitemap's canonical URLs are all
 * default-locale paths (e.g. /quad-desert/, not /fr/quad-desert/). Every
 * other locale gets a real prefix.
 *
 * Automatic Accept-Language detection stays ON (the default) - it's a real
 * feature (a first-time English-preferring visitor lands on /en/ instead
 * of French) and disabling it sitewide was tried and reverted (UI/UX audit,
 * 30 Aug 2026): it also silences the NEXT_LOCALE cookie, so a returning
 * visitor who explicitly picked English via LanguageSwitcher would see
 * French again at the bare root domain. The real bug this detection
 * exposed - the 9 legacy-slug rewrites in next.config.ts only existed for
 * the /fr/ prefix, so detection correctly sent an English browser to
 * /en/nuitee-campement-desert/ and THAT 404s - is fixed at its actual
 * source: next.config.ts's rewrites now cover every locale, not just
 * French, since the destination pages already exist in all 6 languages.
 */
export const routing = defineRouting({
  locales: ["fr", "en", "de", "it", "da", "ar"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

/** Arabic is the only RTL locale here. */
export function isRtl(locale: string): boolean {
  return locale === "ar";
}

/**
 * Prefixes a site-relative path with its locale, honoring the default
 * locale's unprefixed root (`localePrefix: "as-needed"`). For paths that
 * already have their own locale-aware canonical logic (the legacy product
 * slugs in lib/legacySlugs.ts), use that instead - this is for everything
 * else: static pages, breadcrumb "Home"/"Experiences"-style entries, etc.
 */
export function localeHref(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

/**
 * Builds `alternates: { canonical, languages }` together for a page's
 * `generateMetadata`. Necessary because Next.js does NOT merge `alternates`
 * across the layout and page metadata - whatever a page returns replaces
 * the whole object, so a page-level `alternates: { canonical }` silently
 * wipes out the sitewide hreflang tags set in app/[locale]/layout.tsx. Every
 * page with its own canonical must use this instead of a bare `{ canonical }`
 * to keep hreflang intact.
 */
export function localeAlternates(locale: string, pathForLocale: (locale: string) => string) {
  const languages: Record<string, string> = { "x-default": pathForLocale(routing.defaultLocale) };
  for (const l of routing.locales) languages[l] = pathForLocale(l);
  return { canonical: pathForLocale(locale), languages };
}
