import { getSession } from "@/lib/session";
import { BACKEND_BASE } from "@/lib/authProxy";

/**
 * A dedicated route rather than folding this into the generic
 * app/api/proxy/[...path]/route.ts passthrough — that one hardcodes
 * Content-Type: application/json and reads the body via request.text(),
 * which would mangle a multipart file upload (wrong Content-Type, no
 * boundary, binary data run through a text decoder). Rebuilding the
 * FormData and letting `fetch` set its own multipart Content-Type +
 * boundary is what actually forwards a file upload correctly.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const incoming = await request.formData();
  const url = new URL(request.url);
  const companyType = url.searchParams.get("companyType") ?? "DUNES_INSOLITES";

  const outgoing = new FormData();
  const file = incoming.get("file");
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  outgoing.set("file", file);

  const res = await fetch(`${BACKEND_BASE}/media?companyType=${encodeURIComponent(companyType)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: outgoing,
  });

  const text = await res.text();
  return new Response(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
