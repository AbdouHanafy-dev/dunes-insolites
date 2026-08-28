import { cookies } from "next/headers";
import { SESSION_COOKIE, primaryStaffRole, type StaffRole } from "@/lib/session";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export type BackendAuthResult =
  | { ok: true; id: string; name: string; email: string; role: StaffRole }
  | { ok: false; status: number; message: string };

export function backendConfigured(): boolean {
  return BASE !== "";
}

/**
 * Calls the real backend's /api/auth/login server-to-server (no CORS — this
 * runs on the Next.js server, not in the browser) and, on success, sets the
 * httpOnly session cookie. Rejects a real login if the account isn't staff
 * (CLIENT/PARTENAIRE-without-staff-role) — this is a backoffice, not the
 * client account area.
 */
export async function backendLogin(email: string, password: string): Promise<BackendAuthResult> {
  // BASE already includes the backend's own `/api` prefix — see frontend/lib/api.ts's convention.
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
  const role = primaryStaffRole(payload);
  if (!role) {
    return { ok: false, status: 403, message: "This account has no backoffice access." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: typeof data.expiresIn === "number" ? data.expiresIn : 300,
  });

  return { ok: true, id: data.userId, name: data.name, email: data.email, role };
}

export { BASE as BACKEND_BASE };
