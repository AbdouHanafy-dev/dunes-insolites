import { getSession } from "@/lib/session";
import { deleteNotification } from "@/lib/api";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteNotification(session.accessToken, id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Failed." }, { status: 502 });
}
