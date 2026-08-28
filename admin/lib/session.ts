/**
 * Server-only session helpers — same BFF pattern as frontend/lib/session.ts:
 * the real backend answers /api/auth/login with a JWT in the JSON body, not
 * a cookie. Route handlers under app/api/auth/* call the backend
 * server-to-server, then set their own httpOnly cookie so the token never
 * reaches client-side JS. Only claims are read here, not verified — that's
 * fine because this cookie is only ever written by our own server right
 * after a real Keycloak/Spring Boot login; real authorization still happens
 * on the backend via @PreAuthorize on every actual data call.
 */
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admin_session";

export type StaffRole = "ADMIN" | "CAMPING" | "PARTENAIRE";
const STAFF_ROLES: StaffRole[] = ["ADMIN", "CAMPING", "PARTENAIRE"];

export type Session = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  accessToken: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Extracts the primary realm role from a Keycloak JWT's `realm_access.roles`. Null if not staff. */
export function primaryStaffRole(claims: Record<string, unknown>): StaffRole | null {
  const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
  const roles = realmAccess?.roles ?? [];
  return STAFF_ROLES.find((r) => roles.includes(r)) ?? null;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = decodeJwtPayload(token);
  if (!claims) return null;

  const role = primaryStaffRole(claims);
  if (!role) return null; // e.g. a CLIENT token — not a staff account

  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string" ? claims.name : email;
  const id = typeof claims.sub === "string" ? claims.sub : "";
  if (!id || !email) return null;

  return { id, name, email, role, accessToken: token };
}
