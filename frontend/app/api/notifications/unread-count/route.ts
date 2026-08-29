import { getSession } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });
  return Response.json(await getUnreadNotificationCount(session.accessToken));
}
