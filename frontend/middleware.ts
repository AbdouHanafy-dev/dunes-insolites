import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, and static/well-known files - none of
  // these are locale-routed (see app/api/*, app/sitemap.ts, app/robots.ts,
  // app/manifest.ts, which enumerate locales themselves rather than being
  // matched into a [locale] segment).
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
