import { cookies } from "next/headers";
import { SESSION_COOKIE, primaryRole } from "@/lib/session";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export type BackendAuthResult =
  | { ok: true; id: string; name: string; email: string; role: string }
  | { ok: false; status: number; message: string };

/**
 * Calls the real backend's /api/auth/login server-to-server and, on success,
 * sets the httpOnly session cookie. Shared by the login route and the
 * register route (which auto-logs in right after creating the account, so
 * signing up actually starts a session instead of silently leaving the
 * visitor logged out). See lib/session.ts for why the cookie exists.
 */
export async function backendLogin(email: string, password: string): Promise<BackendAuthResult> {
  // BASE already includes the backend's own `/api` prefix (same convention
  // as every path in lib/api.ts, e.g. "/public/activities") - never repeat
  // it here.
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, message: data.message ?? "Invalid email or password." };
  }

  const accessToken: string | undefined = data.accessToken;
  if (!accessToken) {
    return { ok: false, status: 502, message: "Malformed login response." };
  }

  const payload = JSON.parse(
    Buffer.from(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf-8",
    ),
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: typeof data.expiresIn === "number" ? data.expiresIn : 300,
  });

  return { ok: true, id: data.userId, name: data.name, email: data.email, role: primaryRole(payload) };
}

export function backendConfigured(): boolean {
  return BASE !== "";
}

export { BASE as BACKEND_BASE };
