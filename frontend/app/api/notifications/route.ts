import { getSession } from "@/lib/session";
import { getMyNotifications } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });
  return Response.json(await getMyNotifications(session.accessToken));
}
