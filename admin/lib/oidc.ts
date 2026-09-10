/**
 * OIDC Authorization-Code (+ PKCE) helpers for the backoffice login.
 *
 * The admin app used to POST email/password to a custom form → the backend's
 * password grant. That flow can't walk a user through MFA enrolment, password
 * reset, or account-lockout messages — so login now redirects to Keycloak's
 * own hosted login page and comes back with a `code` we exchange server-side.
 *
 * Everything here is server-only (client secret + tokens never reach the
 * browser). Config comes from the environment, not NEXT_PUBLIC_*:
 *   KEYCLOAK_ISSUER_URL   e.g. https://auth.dunesinsolites.com/realms/duneinsolite
 *   KEYCLOAK_CLIENT_ID    e.g. duneinsolite-api
 *   KEYCLOAK_CLIENT_SECRET
 *   ADMIN_BASE_URL        e.g. https://admin.dunesinsolites.com  (for redirect_uri)
 */
import { createHash, randomBytes } from "node:crypto";

const ISSUER = (process.env.KEYCLOAK_ISSUER_URL ?? "").replace(/\/+$/, "");
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET ?? "";
const BASE_URL = (process.env.ADMIN_BASE_URL ?? "").replace(/\/+$/, "");

export const oidcConfigured = () =>
  Boolean(ISSUER && CLIENT_ID && CLIENT_SECRET && BASE_URL);

export const REDIRECT_URI = () => `${BASE_URL}/api/auth/callback`;

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function newPkce() {
  const codeVerifier = b64url(randomBytes(48));
  const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export const newState = () => b64url(randomBytes(24));

export function authorizeUrl(state: string, codeChallenge: string): string {
  const u = new URL(`${ISSUER}/protocol/openid-connect/auth`);
  u.searchParams.set("client_id", CLIENT_ID);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("redirect_uri", REDIRECT_URI());
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

type TokenSet = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
};

// Keycloak sits behind the same nginx as this app; every request through
// middleware can trigger a refresh, so a hung IdP must not hang page loads.
const IDP_TIMEOUT_MS = 5000;

async function tokenRequest(body: Record<string, string>): Promise<TokenSet | null> {
  let res: Response;
  try {
    res = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        ...body,
      }),
      signal: AbortSignal.timeout(IDP_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  return (await res.json()) as TokenSet;
}

export const exchangeCode = (code: string, codeVerifier: string) =>
  tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI(),
    code_verifier: codeVerifier,
  });

export const refreshTokens = (refreshToken: string) =>
  tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

/** Best-effort Keycloak-side session termination. */
export async function endKeycloakSession(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    await fetch(`${ISSUER}/protocol/openid-connect/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(IDP_TIMEOUT_MS),
    });
  } catch {
    /* logout is idempotent enough — clearing our cookies is what matters */
  }
}

export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(
      token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Seconds until the access token expires (negative = already expired). */
export function secondsUntilExpiry(token: string): number {
  const exp = decodeJwt(token)?.exp;
  return typeof exp === "number" ? exp - Math.floor(Date.now() / 1000) : -1;
}
