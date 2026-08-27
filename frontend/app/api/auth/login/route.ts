import { backendConfigured, backendLogin } from "@/lib/authProxy";

/**
 * Proxies to the real backend server-to-server (no CORS involved - this runs
 * on the Next.js server, not in the browser) and sets an httpOnly cookie
 * from the access token it gets back, instead of ever handing the token to
 * client JS. See lib/session.ts for why.
 *
 * Without a backend configured, this stays the original placeholder: accounts
 * aren't connected yet, so nothing pretends to sign anyone in.
 */
export async function POST(request: Request) {
  if (!backendConfigured()) {
    return Response.json(
      { error: "Accounts aren't connected yet — the backend isn't wired up." },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await backendLogin(body.email, body.password);

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status });
  }

  const { id, name, email, role } = result;
  return Response.json({ id, name, email, role });
}
