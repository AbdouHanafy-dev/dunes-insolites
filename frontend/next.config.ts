import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LEGACY_STAY_SLUGS, LEGACY_ACTIVITY_SLUGS } from "./lib/legacySlugs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Must be the monorepo root, not this package: `npm install` (root
    // command per ARCHITECTURE.md) hoists `next` into the root
    // node_modules, and Turbopack refuses to resolve anything above
    // whatever directory this points at. Pointing it at __dirname instead
    // broke `next build`/`next dev` outright on any fresh install — found
    // while verifying the DI-022 rewrites below actually served content.
    root: path.join(__dirname, ".."),
  },

  // @dunes/api-types is a workspace package published as raw TypeScript —
  // there is no build step because it is the contract, not a library. Next
  // has to compile it rather than expecting pre-built JS.
  transpilePackages: ["@dunes/api-types"],
  // The dev-only route indicator (bottom-left) has no effect on production
  // builds, but it sits in the same corner as real UI during local review.
  devIndicators: false,

  // WordPress serves every URL with a trailing slash; Next strips it by
  // default. Without this, all 53 legacy URLs (docs/SEO_PLAN.pdf) become
  // redirects on migration instead of resolving directly — the single most
  // commonly missed step in a WordPress → Next migration (SEO-03).
  trailingSlash: true,

  // Keep the legacy WordPress slugs as the public URL (docs/SEO_PLAN.pdf's
  // "Legacy URL map") while this app's own routes stay organised under
  // /camp and /activities — an invisible rewrite, not a redirect, so the
  // ranking URL never changes. LEGACY_STAY_SLUGS/LEGACY_ACTIVITY_SLUGS
  // (lib/legacySlugs.ts) is the single source of truth this and every
  // page's canonical tag reads from — the two must never disagree about
  // which slugs are "legacy". Only covers the product pages + two pages
  // whose destination already exists; the rest of the legacy map (blog,
  // informational pages, the sabria-evasion landing page) has no page to
  // rewrite to yet and is tracked as a remaining DI-022/DI-026 gap.
  //
  // French-only, and both source AND destination carry the internal /fr
  // prefix: next-intl's middleware runs before these rewrites and already
  // rewrote the unprefixed public URL (e.g. /quad-desert) to its internal
  // default-locale form (/fr/quad-desert) by the time this config sees it,
  // even though the browser never shows that prefix. These legacy slugs
  // never had a non-French version on WordPress, so there's nothing to add
  // for the other 5 locales.
  async rewrites() {
    return [
      ...LEGACY_STAY_SLUGS.map((slug) => ({ source: `/fr/${slug}`, destination: `/fr/camp/${slug}` })),
      ...LEGACY_ACTIVITY_SLUGS.map((slug) => ({ source: `/fr/${slug}`, destination: `/fr/activities/${slug}` })),
      { source: "/fr/presentation-campement-dunes-insolites", destination: "/fr/about" },
      { source: "/fr/dunes-insolites-camp-gallery", destination: "/fr/gallery" },
    ];
  },
};

export default withNextIntl(nextConfig);
