import { getSession } from "@/lib/session";
import { getMyFavorites } from "@/lib/api";

/** The logged-in customer's saved items. Never returns anyone else's: the backend reads the user from the token. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });
  return Response.json(await getMyFavorites(session.accessToken));
}
