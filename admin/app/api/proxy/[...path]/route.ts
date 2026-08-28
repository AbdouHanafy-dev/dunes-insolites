import { getSession } from "@/lib/session";
import { BACKEND_BASE } from "@/lib/authProxy";

/**
 * Generic authenticated BFF passthrough: client components can't attach the
 * access token themselves (it lives only in the httpOnly session cookie,
 * see lib/session.ts), so mutating requests from client forms come here
 * instead of hitting the backend directly. This one handler covers every
 * entity rather than a bespoke route per resource.
 */
async function handler(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
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
