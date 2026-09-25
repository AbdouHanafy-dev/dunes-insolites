import { getSessionRefreshing } from "@/lib/session";

export async function GET() {
  const session = await getSessionRefreshing();
  if (!session) return Response.json({ session: null });
  const { id, name, email, role } = session;
  return Response.json({ session: { id, name, email, role } });
}
