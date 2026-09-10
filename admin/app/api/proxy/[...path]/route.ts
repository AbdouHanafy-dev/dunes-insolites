import { getSession } from "@/lib/session";
import { BACKEND_BASE } from "@/lib/authProxy";

/**
 * Generic authenticated BFF passthrough: client components can't attach the
 * access token themselves (it lives only in the httpOnly session cookie,
 * see lib/session.ts), so mutating requests from client forms come here
 * instead of hitting the backend directly. This one handler covers every
 * entity rather than a bespoke route per resource.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Reject a cross-site mutating request even if a cookie somehow rode along. */
function crossSiteMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false; // same-origin fetch / server call — no Origin header
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

async function handler(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (crossSiteMutation(request)) {
    return Response.json({ error: "Cross-site request rejected" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { path } = await params;
  const url = new URL(request.url);
  const target = `${BACKEND_BASE}/${path.join("/")}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
  };
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
    init.body = await request.text();
  }

  const res = await fetch(target, init);
  const text = await res.text();
  return new Response(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
