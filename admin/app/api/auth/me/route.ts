import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ session: null });
  const { id, name, email, role } = session;
  return Response.json({ session: { id, name, email, role } });
}
