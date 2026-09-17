/**
 * Server-only session helpers. The backoffice logs in via the OIDC
 * Authorization-Code flow (see lib/oidc.ts + app/api/auth/*): Keycloak hosts
 * the login page (password, MFA, reset), and the callback stores the access
 * token in an httpOnly cookie. Its signature, issuer, expiry and authorized
 * party are verified against Keycloak before claims are trusted. Every real
 * data call is still independently authorized by the backend.
 */
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "admin_session";
export const REFRESH_COOKIE = "admin_refresh";
export const OIDC_TX_COOKIE = "admin_oidc_tx";
// path "/" so the middleware (which runs on app routes, not /api/auth) can
// read the refresh token to renew a near-expiry session. httpOnly + Secure +
// SameSite=Strict keep it locked down.
export const REFRESH_COOKIE_PATH = "/";

// STAFF is a real backoffice role (see StaffCrud.tsx / CustomRoleController):
// a "blank slate" account whose actual permissions come entirely from its
// attached custom role, enforced server-side by every endpoint's
// @perm.can(...) check - this list only decides who gets past the login
// gate at all, same as it already did for CAMPING/PARTENAIRE.
export type StaffRole = "ADMIN" | "CAMPING" | "PARTENAIRE" | "STAFF";
const STAFF_ROLES: StaffRole[] = ["ADMIN", "CAMPING", "PARTENAIRE", "STAFF"];

export type Session = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  accessToken: string;
};

let cachedIssuer = "";
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function keycloakVerifier() {
  const issuer = (process.env.KEYCLOAK_ISSUER_URL ?? "").replace(/\/+$/, "");
  const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "";
  if (!issuer || !clientId) return null;
  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedIssuer = issuer;
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  }
  return { issuer, clientId, jwks: cachedJwks };
}

/** Primary realm role from a Keycloak JWT's `realm_access.roles`. Null if not staff. */
export function primaryStaffRole(claims: Record<string, unknown> | JWTPayload): StaffRole | null {
  const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
  const roles = realmAccess?.roles ?? [];
  return STAFF_ROLES.find((r) => roles.includes(r)) ?? null;
}

export async function sessionFromToken(token: string): Promise<Session | null> {
  const verifier = keycloakVerifier();
  if (!verifier) return null;

  let claims: JWTPayload;
  try {
    ({ payload: claims } = await jwtVerify(token, verifier.jwks, {
      issuer: verifier.issuer,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "sub"],
    }));
  } catch {
    return null;
  }

  // Keycloak access tokens often target the built-in `account` audience;
  // `azp` binds this token to the client that requested it.
  if (claims.azp !== verifier.clientId) return null;

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
  return token ? await sessionFromToken(token) : null;
}
