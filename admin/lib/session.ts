/**
 * Server-only session helpers. The backoffice logs in via the OIDC
 * Authorization-Code flow (see lib/oidc.ts + app/api/auth/*): Keycloak hosts
 * the login page (password, MFA, reset), and the callback stores the access
 * token in an httpOnly cookie. Only claims are read here — the token is
 * minted by Keycloak and every real data call is still authorized on the
 * backend via @PreAuthorize.
 */
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admin_session";
export const REFRESH_COOKIE = "admin_refresh";
export const OIDC_TX_COOKIE = "admin_oidc_tx";
// path "/" so the middleware (which runs on app routes, not /api/auth) can
// read the refresh token to renew a near-expiry session. httpOnly + Secure +
// SameSite=Strict keep it locked down.
export const REFRESH_COOKIE_PATH = "/";

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
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Primary realm role from a Keycloak JWT's `realm_access.roles`. Null if not staff. */
export function primaryStaffRole(claims: Record<string, unknown>): StaffRole | null {
  const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
  const roles = realmAccess?.roles ?? [];
  return STAFF_ROLES.find((r) => roles.includes(r)) ?? null;
}

export function sessionFromToken(token: string): Session | null {
  const claims = decodeJwtPayload(token);
  if (!claims) return null;

  const exp = claims.exp;
  if (typeof exp === "number" && exp * 1000 <= Date.now()) return null; // expired

  const role = primaryStaffRole(claims);
  if (!role) return null; // e.g. a CLIENT token — not a staff account

  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string" ? claims.name : email;
  const id = typeof claims.sub === "string" ? claims.sub : "";
  if (!id || !email) return null;

  return { id, name, email, role, accessToken: token };
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sessionFromToken(token) : null;
}
