import { cookies } from "next/headers";
import { OIDC_TX_COOKIE } from "@/lib/session";
import { authorizeUrl, newPkce, newState, oidcConfigured } from "@/lib/oidc";

/**
 * Kicks off the OIDC login: stashes the PKCE verifier + CSRF state in a
 * short-lived httpOnly cookie and redirects to Keycloak's hosted login page.
 * The user comes back to /api/auth/callback with a code.
 */
export async function GET(request: Request) {
  if (!oidcConfigured()) {
    return new Response("Auth not configured (KEYCLOAK_ISSUER_URL / CLIENT_ID / CLIENT_SECRET / ADMIN_BASE_URL)", {
      status: 501,
    });
  }

  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  const state = newState();
  const { codeVerifier, codeChallenge } = newPkce();

  (await cookies()).set(
    OIDC_TX_COOKIE,
    JSON.stringify({ state, codeVerifier, returnTo: safeReturnTo }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // must survive the top-level redirect back from Keycloak
      path: "/api/auth",
      maxAge: 600,
    },
  );

  return Response.redirect(authorizeUrl(state, codeChallenge), 302);
}
