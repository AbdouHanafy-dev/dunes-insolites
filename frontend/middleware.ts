import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

type CmsRedirect = { fromPath: string; toPath: string; statusCode: number };
type MaintenanceWindow = { path: string; message: string | null; endsAt: string | null };

const MAINTENANCE_MESSAGE_HEADER = "x-dunes-maintenance-message";
const MAINTENANCE_ENDS_AT_HEADER = "x-dunes-maintenance-ends-at";
const MAINTENANCE_LOCALE_HEADER = "x-dunes-maintenance-locale";
const MAINTENANCE_FAIL_CLOSED = process.env.MAINTENANCE_FAIL_CLOSED === "true";

// Lets the owner keep browsing the real site while a maintenance window
// hides it from everyone else - same plaintext-token-in-a-cookie pattern
// Next.js's own Draft Mode and Vercel's deployment-protection bypass use,
// not something novel. Visiting any page with ?bypass=<secret> once sets
// a year-long cookie; unset/empty MAINTENANCE_BYPASS_SECRET disables the
// feature entirely rather than accepting an empty token as a match.
const MAINTENANCE_BYPASS_SECRET = process.env.MAINTENANCE_BYPASS_SECRET ?? "";
const MAINTENANCE_BYPASS_COOKIE = "dunes_maintenance_bypass";

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

// Production can fail closed here: a broken maintenance lookup must not
// silently reopen pages that were taken offline during a security incident.
// Local development keeps fail-open behavior unless explicitly enabled.
let cachedMaintenance: MaintenanceWindow[] | null = null;
let maintenanceCachedAt = 0;

async function getMaintenanceWindows(): Promise<MaintenanceWindow[]> {
  if (!BASE) return MAINTENANCE_FAIL_CLOSED ? [{ path: "/*", message: null, endsAt: null }] : [];
  const now = Date.now();
  if (cachedMaintenance && now - maintenanceCachedAt < CACHE_TTL_MS) return cachedMaintenance;
  try {
    const res = await fetch(`${BASE}/public/maintenance-windows`, { next: { revalidate: 60 } });
    if (!res.ok) {
      return MAINTENANCE_FAIL_CLOSED
        ? [{ path: "/*", message: null, endsAt: null }]
        : cachedMaintenance ?? [];
    }
    const data = (await res.json()) as MaintenanceWindow[];
    cachedMaintenance = data;
    maintenanceCachedAt = now;
    return data;
  } catch {
    return MAINTENANCE_FAIL_CLOSED
      ? [{ path: "/*", message: null, endsAt: null }]
      : cachedMaintenance ?? [];
  }
}

function withoutInternalMaintenanceHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete(MAINTENANCE_MESSAGE_HEADER);
  headers.delete(MAINTENANCE_ENDS_AT_HEADER);
  headers.delete(MAINTENANCE_LOCALE_HEADER);
  return headers;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Checked before anything else, including the /maintenance path itself,
  // so the link works no matter which page it was shared for.
  if (MAINTENANCE_BYPASS_SECRET && request.nextUrl.searchParams.get("bypass") === MAINTENANCE_BYPASS_SECRET) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("bypass");
    const response = NextResponse.redirect(cleanUrl, 307);
    response.cookies.set(MAINTENANCE_BYPASS_COOKIE, MAINTENANCE_BYPASS_SECRET, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }
  const hasBypass =
    !!MAINTENANCE_BYPASS_SECRET && request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value === MAINTENANCE_BYPASS_SECRET;

  // The maintenance page itself lives at app/maintenance/ — outside the
  // [locale] segment entirely, so it must never be handed to intlMiddleware
  // (which would try to rewrite it into locale-space and 404, since no
  // app/[locale]/maintenance route exists). Reached two ways: internally,
  // via the rewrite below; directly, if a visitor bookmarks or a crawler
  // requests /maintenance/ while it's showing.
  if (pathname === "/maintenance" || pathname === "/maintenance/") {
    // Remove legacy/query-controlled copy from the visible URL as well as
    // ignoring it. This keeps it out of Next's serialized router state.
    if (request.nextUrl.search) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.search = "";
      return NextResponse.redirect(cleanUrl, 307);
    }
    // Direct visitors must not be able to forge internal values either.
    return NextResponse.next({ request: { headers: withoutInternalMaintenanceHeaders(request) } });
  }

  const maintenanceWindows = await getMaintenanceWindows();
  // An exact-path window always wins over the site-wide one — a specific
  // page's own maintenance notice shouldn't be swallowed by a launch
  // countdown covering everything. "/*" is a synthetic sentinel (created
  // via the admin's "🌐 Tout le site" option, MaintenanceCrud.tsx), not a
  // real path — this is the one and only place it's interpreted as a
  // wildcard rather than matched literally.
  const maintenanceMatch = hasBypass
    ? undefined
    : maintenanceWindows.find((w) => w.path === pathname) ?? maintenanceWindows.find((w) => w.path === "/*");
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
    const requestHeaders = withoutInternalMaintenanceHeaders(request);
    requestHeaders.set(MAINTENANCE_LOCALE_HEADER, locale);
    if (maintenanceMatch.endsAt) requestHeaders.set(MAINTENANCE_ENDS_AT_HEADER, maintenanceMatch.endsAt);
    if (maintenanceMatch.message) requestHeaders.set(MAINTENANCE_MESSAGE_HEADER, maintenanceMatch.message);
    const headers: Record<string, string> = {};
    if (maintenanceMatch.endsAt) {
      const seconds = Math.max(0, Math.round((Date.parse(maintenanceMatch.endsAt) - Date.now()) / 1000));
      headers["Retry-After"] = String(seconds);
    }
    return NextResponse.rewrite(url, {
      status: 503,
      headers,
      request: { headers: requestHeaders },
    });
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
