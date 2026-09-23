import { BACKEND_BASE, backendConfigured } from "@/lib/authProxy";
import { getSession } from "@/lib/session";
import { routing } from "@/i18n/routing";

/**
 * The language the guest is booking in - what every email about the
 * reservation will be written in (the backend stores it as Reservation.locale).
 * Taken from the page the booking form was submitted from: the first path
 * segment of the Referer when it is a locale prefix (`/en/...`), French when
 * unprefixed (the default locale is served at the root), then the visitor's
 * NEXT_LOCALE cookie, then French. Never trusted for anything but choosing an
 * email language, so a wrong value costs nothing.
 */
export function bookingLocale(req: Request): string {
  const locales: readonly string[] = routing.locales;

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const first = new URL(referer).pathname.split("/")[1] ?? "";
      if (locales.includes(first)) return first;
      return routing.defaultLocale;
    } catch {
      // unparseable Referer - fall through to the cookie
    }
  }

  const cookie = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (cookie && locales.includes(cookie)) return cookie;

  return routing.defaultLocale;
}

/** Adds `locale` to a JSON booking body unless the caller already set one. */
export function withLocale(body: string, locale: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.locale !== "string" || record.locale === "") {
        return JSON.stringify({ ...record, locale });
      }
    }
  } catch {
    // not JSON - the backend will reject it with its own validation error
  }
  return body;
}

export async function proxyPublicBooking(req: Request, backendPath: string): Promise<Response | null> {
  if (!backendConfigured()) return null;

  const body = withLocale(await req.text(), bookingLocale(req));
  const session = await getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  // Production nginx overwrites X-Real-IP with the TCP peer before the
  // request reaches Next. Preserve that trusted value so the backend's
  // per-client limiter does not collapse every BFF request onto one IP.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) headers["X-Real-IP"] = realIp;

  try {
    const upstream = await fetch(`${BACKEND_BASE}${backendPath}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: "Booking service is temporarily unavailable." }, { status: 502 });
  }
}
