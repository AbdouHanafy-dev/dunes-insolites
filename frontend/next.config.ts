import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LEGACY_STAY_SLUGS, LEGACY_ACTIVITY_SLUGS } from "./lib/legacySlugs";
import { routing } from "./i18n/routing";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").origin;
  } catch {
    return "'self'";
  }
})();
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://www.google-analytics.com https://*.google-analytics.com`,
  "media-src 'self' blob:",
  "frame-src https://www.openstreetmap.org https://www.google.com",
  "frame-ancestors 'self' https://admin.dunesinsolites.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // AVIF first, WebP fallback — Next only serves WebP by default. AVIF is
  // ~20-30% smaller than WebP at equal visual quality on photographic
  // content (this site's product: desert/camp photography), which is a
  // direct LCP win on the hero/product images already marked `priority`.
  images: {
    formats: ["image/avif", "image/webp"],
  },
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

  // SEO/security audit. The CSP permits the site's intentional JSON-LD and
  // Next.js inline bootstrap, while denying plugins/objects, unknown frames,
  // unexpected connections and framing by origins other than our backoffice.
  // A nonce-based script policy would force every public page into dynamic
  // rendering, so this enforced policy preserves static/ISR performance.
  // Four additional headers have no downside for this
  // site's actual behavior: only the admin origin may embed the live CMS
  // preview; nothing needs MIME sniffing, a full cross-site referrer, camera,
  // microphone, or geolocation.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
