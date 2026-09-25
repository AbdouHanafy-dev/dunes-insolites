import { getSessionRefreshing } from "@/lib/session";
import { BACKEND_BASE, forwardedClientHeaders } from "@/lib/authProxy";

/**
 * Generic authenticated BFF passthrough: client components can't attach the
 * access token themselves (it lives only in the httpOnly session cookie,
 * see lib/session.ts), so mutating requests from client forms come here
 * instead of hitting the backend directly. This one handler covers every
 * entity rather than a bespoke route per resource.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Reject a cross-site mutating request even if a cookie somehow rode along.
 *
 * Prefers the real `Host` header over `request.url` — behind nginx (which
 * does forward `Host` correctly, confirmed live), `next start` still
 * builds `request.url` from the Node server's own bind address (found
 * live: "https://0.0.0.0:3100/...", not the real domain), which was
 * rejecting every mutating request as cross-site in prod. Falls back to
 * `request.url`'s host when `Host` is absent — a real HTTP request always
 * carries one, but a synthetic `Request` built in a test doesn't.
 */
function crossSiteMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false; // same-origin fetch / server call — no Origin header
  try {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

async function handler(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (crossSiteMutation(request)) {
    return Response.json({ error: "Cross-site request rejected" }, { status: 403 });
  }

  const session = await getSessionRefreshing();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { path } = await params;
  const url = new URL(request.url);
  const target = `${BACKEND_BASE}/${path.join("/")}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      ...forwardedClientHeaders(request),
    },
  };
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
    init.body = await request.text();
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (cause) {
    const detail = cause instanceof Error && cause.message ? ` (${cause.message})` : "";
    return Response.json(
      { message: `Le backend est injoignable — ${request.method} /${path.join("/")}${detail}` },
      { status: 502 },
    );
  }
  const text = await res.text();
  return new Response(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
