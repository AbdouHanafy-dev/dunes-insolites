/**
 * Server-only session helpers for the client account area ("espace client").
 *
 * The real backend answers /api/auth/login with a JWT in the JSON body, not
 * a Set-Cookie header (API_CONTRACT.md documents the cookie contract this
 * frontend was originally written against, but the actual Spring Boot
 * behaviour never matched it). Rather than change the backend's token
 * contract - other consumers, like the Angular admin/partner/camping apps,
 * likely depend on the JSON shape - the Next.js route handlers under
 * app/api/auth/* act as a small BFF: they call the backend server-to-server
 * (no CORS involved, since that's server-to-server, not browser-to-backend),
 * then set their own httpOnly cookie so the access token never reaches
 * client-side JS. See app/api/auth/login/route.ts.
 *
 * Only claims are read here, not verified (no signature check). That's
 * acceptable because this cookie is only ever written by our own server
 * immediately after a real Keycloak/Spring Boot login response - nothing
 * else can set it (httpOnly, same-origin). Real authorization still happens
 * on the backend via @PreAuthorize on every actual data call; this is only
 * used for UI-level routing decisions (which redirect, which nav to show).
 */
import { cookies } from "next/headers";

export const SESSION_COOKIE = "di_session";

export type Session = {
  id: string;
  name: string;
  email: string;
  role: string;
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

/** Extracts the primary realm role from a Keycloak JWT's `realm_access.roles`. */
export function primaryRole(claims: Record<string, unknown>): string {
  const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
  const roles = realmAccess?.roles ?? [];
  const known = ["ADMIN", "CAMPING", "PARTENAIRE", "CLIENT"];
  return known.find((r) => roles.includes(r)) ?? "CLIENT";
}

/** Reads the current session from the httpOnly cookie. Server-side only (Server Components, Route Handlers). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = decodeJwtPayload(token);
  if (!claims) return null;

  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string" ? claims.name : email;
  const id = typeof claims.sub === "string" ? claims.sub : "";
  if (!id || !email) return null;

  return { id, name, email, role: primaryRole(claims), accessToken: token };
}
