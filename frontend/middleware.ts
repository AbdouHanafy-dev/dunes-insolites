import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

type CmsRedirect = { fromPath: string; toPath: string; statusCode: number };

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

export default async function middleware(request: NextRequest) {
  const redirects = await getRedirects();
  if (redirects.length > 0) {
    const match = redirects.find((r) => r.fromPath === request.nextUrl.pathname);
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
