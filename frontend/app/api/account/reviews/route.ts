import { getSession } from "@/lib/session";
import { createMyReview } from "@/lib/api";

/**
 * Client-side review form calls this instead of the backend directly — the
 * access token lives only in the httpOnly session cookie (see
 * lib/session.ts), never in client JS, so the form can't attach it itself.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = await createMyReview(session.accessToken, body);

  if (!result.ok) return Response.json({ error: result.message }, { status: 400 });
  return Response.json(result.data, { status: 201 });
}
