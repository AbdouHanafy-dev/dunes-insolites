import { backendConfigured, backendLogin, BACKEND_BASE } from "@/lib/authProxy";

/**
 * Proxies registration to the real backend, then immediately logs the new
 * account in (see backendLogin) so signing up actually starts a session
 * instead of creating an account and leaving the visitor logged out. See the
 * cookie note in ../login/route.ts.
 *
 * Without a backend configured, this stays the original placeholder.
 */
export async function POST(request: Request) {
  if (!backendConfigured()) {
    return Response.json(
      { error: "Accounts aren't connected yet — the backend isn't wired up." },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => ({}));

  // BACKEND_BASE already includes the backend's own `/api` prefix - see the
  // note in lib/authProxy.ts.
  const res = await fetch(`${BACKEND_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return Response.json(
      { error: data.message ?? "Could not create the account." },
      { status: res.status },
    );
  }

  const result = await backendLogin(body.email, body.password);
  if (!result.ok) {
    // Account was created but the auto-login failed - still a success for
    // the signup itself, just without a session. Rare (would mean the
    // password we just used to register was instantly rejected on login).
    return Response.json({ id: data.userId, name: data.name, email: data.email, role: "CLIENT" });
  }

  const { id, name, email, role } = result;
  return Response.json({ id, name, email, role });
}
