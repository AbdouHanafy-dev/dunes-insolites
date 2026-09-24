import { getSession } from "@/lib/session";
import { mergeMyFavorites } from "@/lib/api";

/** Called once after login: folds the browser's saved items into the account and returns the full list. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) return Response.json({ error: "Invalid request." }, { status: 400 });

  // Only the two fields the backend accepts, and only strings: the rest is validated there.
  const clean = items
    .filter((i): i is { type: string; slug: string } => typeof i?.type === "string" && typeof i?.slug === "string")
    .map((i) => ({ type: i.type, slug: i.slug }));

  const merged = await mergeMyFavorites(session.accessToken, clean);
  if (!merged) return Response.json({ error: "Could not save favourites." }, { status: 502 });
  return Response.json(merged);
}
