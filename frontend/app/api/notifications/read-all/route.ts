import { getSession } from "@/lib/session";
import { markAllNotificationsRead } from "@/lib/api";

export async function PATCH() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });
  const ok = await markAllNotificationsRead(session.accessToken);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Failed." }, { status: 502 });
}
