import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

type CmsRedirect = { fromPath: string; toPath: string; statusCode: number };
type MaintenanceWindow = { path: string; message: string | null; endsAt: string | null };

// Best-effort, in-memory only — middleware runs in the Edge runtime, whose
// instances can be recycled between requests, so this cache is a latency
// optimization, not a guarantee. `next: { revalidate }` on the fetch itself
// is the real cross-invocation cache where the platform honors it. Either
// way this never adds a hard dependency on the backend being up: any
// failure (no BASE configured, fetch throws, non-2xx) falls back to the
// last good list, or an empty one — which just means no redirect fires,
// same "fail open, never blank the page" convention as lib/api.ts's get().
let cachedRedirects: CmsRedirect[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

async function getRedirects(): Promise<CmsRedirect[]> {
  if (!BASE) return [];
  const now = Date.now();
  if (cachedRedirects && now - cachedAt < CACHE_TTL_MS) return cachedRedirects;
  try {
    const res = await fetch(`${BASE}/public/redirects`, { next: { revalidate: 60 } });
    if (!res.ok) return cachedRedirects ?? [];
    const data = (await res.json()) as CmsRedirect[];
    cachedRedirects = data;
    cachedAt = now;
    return data;
  } catch {
    return cachedRedirects ?? [];
  }
}

// Same cache shape and same fail-open reasoning as getRedirects() above — if
// the backend is unreachable we let the page through rather than risk
// blocking the whole site because a status check failed.
let cachedMaintenance: MaintenanceWindow[] | null = null;
let maintenanceCachedAt = 0;

async function getMaintenanceWindows(): Promise<MaintenanceWindow[]> {
  if (!BASE) return [];
  const now = Date.now();
  if (cachedMaintenance && now - maintenanceCachedAt < CACHE_TTL_MS) return cachedMaintenance;
  try {
    const res = await fetch(`${BASE}/public/maintenance-windows`, { next: { revalidate: 60 } });
    if (!res.ok) return cachedMaintenance ?? [];
    const data = (await res.json()) as MaintenanceWindow[];
    cachedMaintenance = data;
    maintenanceCachedAt = now;
    return data;
  } catch {
    return cachedMaintenance ?? [];
  }
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // The maintenance page itself lives at app/maintenance/ — outside the
  // [locale] segment entirely, so it must never be handed to intlMiddleware
  // (which would try to rewrite it into locale-space and 404, since no
  // app/[locale]/maintenance route exists). Reached two ways: internally,
  // via the rewrite below; directly, if a visitor bookmarks or a crawler
  // requests /maintenance/ while it's showing.
  if (pathname === "/maintenance" || pathname === "/maintenance/") {
    return NextResponse.next();
  }

  const maintenanceWindows = await getMaintenanceWindows();
  const maintenanceMatch = maintenanceWindows.find((w) => w.path === pathname);
  if (maintenanceMatch) {
    // A real rewrite, not a redirect: the URL bar keeps showing the page
    // the visitor asked for (it still exists, it's just down right now),
    // and only this one path is affected — everything else on the site
    // renders normally. 503 + Retry-After is the status Google documents
    // for "temporarily unavailable, come back later" so the page doesn't
    // get dropped from the index over a short outage — the same SEO
    // discipline as the trailing-slash/legacy-slug rules elsewhere in this
    // file. The maintenance page itself lives outside [locale] (its own
    // self-contained multi-language copy) so it never has to go through
    // intlMiddleware below.
    const url = new URL("/maintenance/", request.url);
    const localeSegment = pathname.split("/")[1];
    const locale = (routing.locales as readonly string[]).includes(localeSegment)
      ? localeSegment
      : routing.defaultLocale;
    url.searchParams.set("locale", locale);
    if (maintenanceMatch.endsAt) url.searchParams.set("endsAt", maintenanceMatch.endsAt);
    if (maintenanceMatch.message) url.searchParams.set("msg", maintenanceMatch.message);
    const headers: Record<string, string> = {};
    if (maintenanceMatch.endsAt) {
      const seconds = Math.max(0, Math.round((Date.parse(maintenanceMatch.endsAt) - Date.now()) / 1000));
      headers["Retry-After"] = String(seconds);
    }
    return NextResponse.rewrite(url, { status: 503, headers });
  }

  const redirects = await getRedirects();
  if (redirects.length > 0) {
    const match = redirects.find((r) => r.fromPath === pathname);
    if (match) {
      const status = match.statusCode === 302 ? 302 : 301;
      const destination = match.toPath.startsWith("http")
        ? match.toPath
        : new URL(match.toPath, request.url);
      return NextResponse.redirect(destination, status);
    }
  }
  return intlMiddleware(request);
}

export const config = {
  // Skip API routes, Next internals, and static/well-known files - none of
  // these are locale-routed (see app/api/*, app/sitemap.ts, app/robots.ts,
  // app/manifest.ts, which enumerate locales themselves rather than being
  // matched into a [locale] segment). Redirects are checked against
  // whatever pathname passes this same matcher.
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
