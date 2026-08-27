import type { MetadataRoute } from "next";
import { getActivities, getStays } from "@/lib/api";
import { site } from "@/lib/site";
import { canonicalActivityPath, canonicalStayPath } from "@/lib/legacySlugs";
import { routing, localeHref } from "@/i18n/routing";

/**
 * Rebuilt from lib/api (DI-025) rather than importing lib/data/* directly —
 * so this reflects the real backend catalogue once NEXT_PUBLIC_API_URL is
 * set, not just the seed data, and never drifts from what getActivities()/
 * getStays() actually serve everywhere else on the site.
 *
 * Now loops over every locale (multi-language rollout) and attaches
 * `alternates.languages` per URL so Google can tell these are the same page
 * in different languages rather than separate content. `x-default` always
 * points at the French (default, unprefixed) version.
 *
 * No `lastModified` is set anywhere here: this app tracks no real content
 * modification timestamp for any page (static or catalogue), and stamping
 * every entry with `new Date()` on every build — the previous behaviour —
 * tells Google every page changed on every deploy, which is worse than not
 * claiming a date at all.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activities, stays] = await Promise.all([getActivities(), getStays()]);

  const staticPaths = [
    { path: "", priority: 1 },
    { path: "/activities", priority: 0.9 },
    { path: "/camp", priority: 0.9 },
    { path: "/gallery", priority: 0.7 },
    { path: "/about", priority: 0.7 },
    { path: "/safety", priority: 0.6 },
    { path: "/contact", priority: 0.6 },
    { path: "/legal/privacy", priority: 0.2 },
    { path: "/legal/terms", priority: 0.2 },
  ];

  function languageAlternates(pathForLocale: (locale: string) => string) {
    const languages: Record<string, string> = { "x-default": `${site.url}${pathForLocale(routing.defaultLocale)}` };
    for (const locale of routing.locales) {
      languages[locale] = `${site.url}${pathForLocale(locale)}`;
    }
    return languages;
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority } of staticPaths) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${localeHref(locale, path)}`,
        changeFrequency: "monthly",
        priority,
        alternates: { languages: languageAlternates((l) => localeHref(l, path)) },
      });
    }
  }

  for (const activity of activities) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${canonicalActivityPath(activity.slug, locale)}`,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: languageAlternates((l) => canonicalActivityPath(activity.slug, l)) },
      });
    }
  }

  for (const stay of stays) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${canonicalStayPath(stay.slug, locale)}`,
        changeFrequency: "monthly",
        priority: 0.85,
        alternates: { languages: languageAlternates((l) => canonicalStayPath(stay.slug, l)) },
      });
    }

    // Always nested under /camp/{stay}/{accommodation}, regardless of
    // whether the parent stay has a legacy flat URL — accommodation
    // sub-pages are new to this app, WordPress never indexed one, so
    // there's no ranking URL to preserve (matches this page's own
    // canonical tag in app/[locale]/camp/[slug]/[accommodation]/page.tsx).
    for (const accommodation of stay.accommodations ?? []) {
      const path = `/camp/${stay.slug}/${accommodation.slug}`;
      for (const locale of routing.locales) {
        entries.push({
          url: `${site.url}${localeHref(locale, path)}`,
          changeFrequency: "monthly",
          priority: 0.6,
          alternates: { languages: languageAlternates((l) => localeHref(l, path)) },
        });
      }
    }
  }

  return entries;
}
