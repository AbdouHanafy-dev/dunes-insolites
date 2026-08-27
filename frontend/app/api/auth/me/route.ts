import { getSession } from "@/lib/session";

/** Used by client components (Header) that need to know if someone is logged in. Never returns the access token. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ session: null });
  const { id, name, email, role } = session;
  return Response.json({ session: { id, name, email, role } });
}
