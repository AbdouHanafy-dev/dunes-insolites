import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SESSION_COOKIE,
  sessionFromToken,
} from "@/lib/session";
import { refreshTokens, secondsUntilExpiry } from "@/lib/oidc";

// Runs on every app route (not /login, /api/*, static). Keeps the access
// token fresh transparently and bounces unauthenticated users to Keycloak.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.).*)"],
};

const REFRESH_SKEW_SECONDS = 60;

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  const valid = token ? sessionFromToken(token) : null;
  const fresh = valid && secondsUntilExpiry(token!) > REFRESH_SKEW_SECONDS;
  if (fresh) return NextResponse.next();

  // Try a silent refresh.
  if (refresh) {
    const t = await refreshTokens(refresh);
    if (t?.access_token && sessionFromToken(t.access_token)) {
      const res = NextResponse.next();
      const secure = process.env.NODE_ENV === "production";
      res.cookies.set(SESSION_COOKIE, t.access_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: t.expires_in ?? 300,
      });
      if (t.refresh_token) {
        res.cookies.set(REFRESH_COOKIE, t.refresh_token, {
          httpOnly: true,
          secure,
          sameSite: "strict",
          path: REFRESH_COOKIE_PATH,
          maxAge: t.refresh_expires_in ?? 1800,
        });
      }
      return res;
    }
  }

  // No usable session — start the login flow, remembering where they were.
  const url = req.nextUrl.clone();
  const returnTo = url.pathname + url.search;
  const res = NextResponse.redirect(new URL(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`, req.url));
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
