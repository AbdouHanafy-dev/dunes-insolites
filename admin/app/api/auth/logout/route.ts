import { cookies } from "next/headers";
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH, SESSION_COOKIE } from "@/lib/session";
import { endKeycloakSession } from "@/lib/oidc";

const ADMIN_BASE = (process.env.ADMIN_BASE_URL ?? "").replace(/\/+$/, "");

async function doLogout() {
  const store = await cookies();
  await endKeycloakSession(store.get(REFRESH_COOKIE)?.value);
  store.delete({ name: SESSION_COOKIE, path: "/" });
  store.delete({ name: REFRESH_COOKIE, path: REFRESH_COOKIE_PATH });
}

// POST — the app's own "sign out" button (fetch); returns JSON.
export async function POST() {
  await doLogout();
  return Response.json({ ok: true });
}

// GET — a plain link; redirects to the login page.
export async function GET() {
  await doLogout();
  return Response.redirect(`${ADMIN_BASE}/login`, 302);
}
