import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LEGACY_STAY_SLUGS, LEGACY_ACTIVITY_SLUGS } from "./lib/legacySlugs";
import { routing } from "./i18n/routing";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Lean container image for the VPS deploy — traced runtime files only,
  // rooted at the monorepo so hoisted deps + @dunes/api-types come along.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
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
  // Every locale, not just French — found live (UI/UX audit, 30 Aug 2026):
  // this used to be /fr/-only, reasoned as fine because "these legacy
  // slugs never had a non-French version on WordPress". True, but
  // irrelevant to what actually happens: next-intl's Accept-Language
  // detection (a real, wanted feature - kept ON, see i18n/routing.ts's own
  // comment) sends any English-preferring first-time visitor with no
  // NEXT_LOCALE cookie yet to /en/nuitee-campement-desert/ before this
  // config is ever consulted - a plain `curl` with no Accept-Language
  // header never showed this, which is exactly how it went unnoticed.
  // That path 404'd for every one of the 9 legacy URLs, breaking a real,
  // Google-ranked SEO URL for a large share of real first-time visitors
  // the moment DNS points here. The destination pages already exist in
  // all 6 locales (app/[locale]/(site)/camp/[slug], /activities/[slug],
  // /about, /gallery), so the fix is to rewrite for every locale next-intl
  // might land a visitor on, not to fight the detection itself.
  async rewrites() {
    return routing.locales.flatMap((locale) => [
      ...LEGACY_STAY_SLUGS.map((slug) => ({
        source: `/${locale}/${slug}`,
        destination: `/${locale}/camp/${slug}`,
      })),
      ...LEGACY_ACTIVITY_SLUGS.map((slug) => ({
        source: `/${locale}/${slug}`,
        destination: `/${locale}/activities/${slug}`,
      })),
      {
        source: `/${locale}/presentation-campement-dunes-insolites`,
        destination: `/${locale}/about`,
      },
      {
        source: `/${locale}/dunes-insolites-camp-gallery`,
        destination: `/${locale}/gallery`,
      },
    ]);
  },

  // SEO/security audit, step 8. Four headers with no downside for this
  // site's actual behavior: nothing here embeds this site in an iframe
  // (DENY is safe), nothing needs the browser to guess a MIME type, no page
  // relies on sending a full referrer to a third party, and camera/mic/
  // geolocation are never used anywhere in this app.
  //
  // Deliberately NOT shipping a Content-Security-Policy here: the JSON-LD
  // blocks in app/[locale]/layout.tsx (LodgingBusiness/Organization/WebSite)
  // and the FAQPage block on /safety are inline `<script>` tags via
  // dangerouslySetInnerHTML - a real CSP needs a nonce-per-request wired
  // through middleware to allow those without `unsafe-inline` (which would
  // defeat the point of adding one). That's a real, separate piece of work,
  // not a header to bolt on alongside these four.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
