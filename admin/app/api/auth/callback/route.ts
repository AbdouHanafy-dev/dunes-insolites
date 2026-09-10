import { cookies } from "next/headers";
import {
  OIDC_TX_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SESSION_COOKIE,
  sessionFromToken,
} from "@/lib/session";
import { exchangeCode } from "@/lib/oidc";

const ADMIN_BASE = (process.env.ADMIN_BASE_URL ?? "").replace(/\/+$/, "");

function fail(reason: string) {
  return Response.redirect(`${ADMIN_BASE}/login?error=${encodeURIComponent(reason)}`, 302);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oidcError = url.searchParams.get("error");

  const store = await cookies();
  const txRaw = store.get(OIDC_TX_COOKIE)?.value;
  store.delete({ name: OIDC_TX_COOKIE, path: "/api/auth" });

  if (oidcError) return fail(oidcError);
  if (!code || !state || !txRaw) return fail("invalid_request");

  let tx: { state: string; codeVerifier: string; returnTo: string };
  try {
    tx = JSON.parse(txRaw);
  } catch {
    return fail("invalid_state");
  }
  if (tx.state !== state) return fail("state_mismatch");

  const tokens = await exchangeCode(code, tx.codeVerifier);
  if (!tokens?.access_token) return fail("token_exchange_failed");

  // Backoffice only — reject a token with no staff role.
  const session = sessionFromToken(tokens.access_token);
  if (!session) return fail("no_backoffice_access");

  const secure = process.env.NODE_ENV === "production";

  store.set(SESSION_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in ?? 300,
  });

  if (tokens.refresh_token) {
    store.set(REFRESH_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: REFRESH_COOKIE_PATH, // only sent to /api/auth/* — minimises exposure
      maxAge: tokens.refresh_expires_in ?? 1800,
    });
  }

  const returnTo = tx.returnTo?.startsWith("/") && !tx.returnTo.startsWith("//") ? tx.returnTo : "/";
  return Response.redirect(`${ADMIN_BASE}${returnTo}`, 302);
}
