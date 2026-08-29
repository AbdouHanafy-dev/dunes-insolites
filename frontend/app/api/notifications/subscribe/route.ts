import { getSession } from "@/lib/session";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

// Never cache/pre-render a live stream, and never let Next buffer it as a
// single response — both would turn "real-time" into "eventually".
export const dynamic = "force-dynamic";

/**
 * Streams the backend's real SSE connection (SecurityConfig's bearer-token
 * resolver has a documented exception for exactly this endpoint - the
 * browser's native EventSource can't set an Authorization header) through
 * to the browser, without ever putting the access token where client JS
 * could read it.
 *
 * The backend's own fallback for EventSource callers is a
 * "?access_token=..." query param - the wrong shape here too, since the
 * token still lives only in this app's httpOnly session cookie, never in
 * client-side JS that could put it on a URL. Instead: the browser's
 * EventSource connects to this same-origin route (cookie sent
 * automatically, same as any same-origin request); this route reads the
 * cookie server-side, opens the real backend connection with a real
 * Authorization header (a plain server-to-server fetch, no EventSource
 * limitation), and pipes that response's body straight through.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  if (!BASE) return new Response(null, { status: 501 });

  const upstream = await fetch(`${BASE}/notifications/subscribe`, {
    headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "text/event-stream" },
    // @ts-expect-error -- Node's fetch requires this for a duplex stream
    // response even though we only ever read it here (never send a body
    // of our own); TypeScript's lib.dom fetch types don't know about it.
    duplex: "half",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable any intermediary proxy buffering
    },
  });
}
