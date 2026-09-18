import type { MetadataRoute } from "next";
import { getActivities, getStays, getTours } from "@/lib/api";
import { site } from "@/lib/site";
import { canonicalActivityPath, canonicalStayPath } from "@/lib/legacySlugs";
import { routing, localeHref } from "@/i18n/routing";
import { withTrailingSlash } from "@/lib/schema";
import { GUIDE_SLUGS } from "@/lib/guides";

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
// next.config.ts sets trailingSlash: true, so every URL this app actually
// serves ends in "/" (the homepage included) — a request without one gets a
// 308 first. localeHref/canonicalActivityPath/canonicalStayPath don't add
// that slash themselves (they're shared with next.config.ts's rewrites and
// each page's own canonical tag, which - unlike a hand-written sitemap URL -
// go through Next's own URL resolution and pick the slash up automatically).
// Found by building the admin's Sitemap overview (docs/cms.md) and seeing
// every non-homepage entry disagree with its own page's canonical tag by
// exactly a trailing slash. withTrailingSlash itself now lives in
// lib/schema.ts - breadcrumbJsonLd needed the exact same fix for the exact
// same reason (found in the SEO/vitrine audit), so it's the one shared
// copy now instead of two that could drift apart again.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activities, stays, tours] = await Promise.all([getActivities(), getStays(), getTours()]);

  const staticPaths = [
    { path: "", priority: 1 },
    { path: "/activities", priority: 0.9 },
    { path: "/camp", priority: 0.9 },
    { path: "/gallery", priority: 0.7 },
    { path: "/about", priority: 0.7 },
    // Route Insolite's circuit listing — real, admin-managed content since
    // 18 Sep 2026 (see docs/OPEN-QUESTIONS.md Q6's addendum), not the
    // "coming soon" stub the legacy WordPress circuit URLs used to 301 to.
    { path: "/circuits", priority: 0.7 },
    { path: "/safety", priority: 0.6 },
    { path: "/contact", priority: 0.6 },
    { path: "/faq", priority: 0.6 },
    { path: "/guides", priority: 0.6 },
    { path: "/legal/privacy", priority: 0.2 },
    { path: "/legal/terms", priority: 0.2 },
  ];

  function languageAlternates(pathForLocale: (locale: string) => string) {
    const languages: Record<string, string> = {
      "x-default": `${site.url}${withTrailingSlash(pathForLocale(routing.defaultLocale))}`,
    };
    for (const locale of routing.locales) {
      languages[locale] = `${site.url}${withTrailingSlash(pathForLocale(locale))}`;
    }
    return languages;
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority } of staticPaths) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${withTrailingSlash(localeHref(locale, path))}`,
        changeFrequency: "monthly",
        priority,
        alternates: { languages: languageAlternates((l) => localeHref(l, path)) },
      });
    }
  }

  // Guide articles - now translated into all 6 locales (lib/guides.ts),
  // same languageAlternates() every other page on the site uses.
  for (const guide of GUIDE_SLUGS) {
    const path = `/guides/${guide.slug}`;
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${withTrailingSlash(localeHref(locale, path))}`,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: { languages: languageAlternates((l) => localeHref(l, path)) },
      });
    }
  }

  for (const activity of activities) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${withTrailingSlash(canonicalActivityPath(activity.slug, locale))}`,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: languageAlternates((l) => canonicalActivityPath(activity.slug, l)) },
      });
    }
  }

  for (const tour of tours) {
    const path = `/circuits/${tour.slug}`;
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${withTrailingSlash(localeHref(locale, path))}`,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: { languages: languageAlternates((l) => localeHref(l, path)) },
      });
    }
  }

  for (const stay of stays) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${site.url}${withTrailingSlash(canonicalStayPath(stay.slug, locale))}`,
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
          url: `${site.url}${withTrailingSlash(localeHref(locale, path))}`,
          changeFrequency: "monthly",
          priority: 0.6,
          alternates: { languages: languageAlternates((l) => localeHref(l, path)) },
        });
      }
    }
  }

  return entries;
}
