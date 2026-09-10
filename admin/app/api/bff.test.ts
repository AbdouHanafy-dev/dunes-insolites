import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Production-hardening item 7 — the admin BFF.
 *
 * The httpOnly-cookie architecture is preserved; these tests lock in its
 * security properties: the Keycloak token never reaches the client, the
 * session cookie is httpOnly + SameSite=Strict, the proxy refuses
 * unauthenticated and cross-site-mutating requests, and backend 401/403
 * propagate.
 */

// ── a stateful fake for next/headers cookies() ────────────────────────────
type CookieOpts = Record<string, unknown>;
const cookieStore = new Map<string, { value: string; opts: CookieOpts }>();
const cookies = vi.fn(async () => ({
  get: (name: string) => {
    const e = cookieStore.get(name);
    return e ? { name, value: e.value } : undefined;
  },
  set: (name: string, value: string, opts: CookieOpts = {}) =>
    cookieStore.set(name, { value, opts }),
  delete: (arg: string | { name: string }) =>
    cookieStore.delete(typeof arg === "string" ? arg : arg.name),
}));
vi.mock("next/headers", () => ({ cookies }));

// ── helpers ──────────────────────────────────────────────────────────────
function jwt(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64(claims)}.sig`;
}
const ADMIN_JWT = jwt({
  sub: "admin-uuid",
  email: "admin@dunes.test",
  name: "Ada Admin",
  realm_access: { roles: ["ADMIN", "offline_access"] },
});
const CLIENT_JWT = jwt({
  sub: "client-uuid",
  email: "c@dunes.test",
  name: "Cli",
  realm_access: { roles: ["CLIENT"] },
});

beforeEach(() => {
  cookieStore.clear();
  process.env.NEXT_PUBLIC_API_URL = "https://api.dunes.test/api";
  vi.restoreAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

// ── OIDC login (Authorization-Code + PKCE) ───────────────────────────────
const OIDC_ENV = {
  KEYCLOAK_ISSUER_URL: "https://auth.dunes.test/realms/duneinsolite",
  KEYCLOAK_CLIENT_ID: "duneinsolite-api",
  KEYCLOAK_CLIENT_SECRET: "s3cr3t",
  ADMIN_BASE_URL: "https://admin.dunes.test",
};

describe("GET /api/auth/login", () => {
  beforeEach(() => Object.assign(process.env, OIDC_ENV));

  it("redirects to Keycloak with PKCE + state and stashes a tx cookie", async () => {
    const { GET } = await import("./auth/login/route");
    const res = await GET(new Request("http://localhost:3100/api/auth/login?returnTo=/reservations"));
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin + loc.pathname).toBe("https://auth.dunes.test/realms/duneinsolite/protocol/openid-connect/auth");
    expect(loc.searchParams.get("response_type")).toBe("code");
    expect(loc.searchParams.get("code_challenge_method")).toBe("S256");
    expect(loc.searchParams.get("redirect_uri")).toBe("https://admin.dunes.test/api/auth/callback");
    const state = loc.searchParams.get("state")!;
    const tx = JSON.parse(cookieStore.get("admin_oidc_tx")!.value);
    expect(tx.state).toBe(state);
    expect(tx.returnTo).toBe("/reservations");
    expect(cookieStore.get("admin_oidc_tx")!.opts.httpOnly).toBe(true);
  });
});

describe("GET /api/auth/callback", () => {
  beforeEach(() => Object.assign(process.env, OIDC_ENV));

  async function beginLogin() {
    const { GET } = await import("./auth/login/route");
    const res = await GET(new Request("http://localhost:3100/api/auth/login"));
    return new URL(res.headers.get("location")!).searchParams.get("state")!;
  }

  it("exchanges the code, stores an httpOnly session + refresh cookie, no token to the client", async () => {
    const state = await beginLogin();
    stubFetch(async () =>
      new Response(JSON.stringify({ access_token: ADMIN_JWT, refresh_token: "rt", expires_in: 300, refresh_expires_in: 1800 }), { status: 200 }),
    );
    const { GET } = await import("./auth/callback/route");
    const res = await GET(new Request(`http://localhost:3100/api/auth/callback?code=abc&state=${state}`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://admin.dunes.test/");

    const s = cookieStore.get("admin_session")!;
    expect(s.value).toBe(ADMIN_JWT);
    expect(s.opts.httpOnly).toBe(true);
    const r = cookieStore.get("admin_refresh")!;
    expect(r.value).toBe("rt");
    expect(r.opts.sameSite).toBe("strict");
    expect(cookieStore.has("admin_oidc_tx")).toBe(false); // consumed
  });

  it("rejects a state mismatch (CSRF) without calling the token endpoint", async () => {
    await beginLogin();
    const f = stubFetch(async () => new Response("{}"));
    const { GET } = await import("./auth/callback/route");
    const res = await GET(new Request("http://localhost:3100/api/auth/callback?code=abc&state=forged"));
    expect(res.headers.get("location")).toContain("/login?error=state_mismatch");
    expect(f).not.toHaveBeenCalled();
    expect(cookieStore.has("admin_session")).toBe(false);
  });

  it("rejects a non-staff (CLIENT) token and sets no session", async () => {
    const state = await beginLogin();
    stubFetch(async () => new Response(JSON.stringify({ access_token: CLIENT_JWT, expires_in: 300 }), { status: 200 }));
    const { GET } = await import("./auth/callback/route");
    const res = await GET(new Request(`http://localhost:3100/api/auth/callback?code=abc&state=${state}`));
    expect(res.headers.get("location")).toContain("/login?error=no_backoffice_access");
    expect(cookieStore.has("admin_session")).toBe(false);
  });
});

// ── session / logout ─────────────────────────────────────────────────────
describe("session", () => {
  it("getSession returns null with no cookie", async () => {
    const { getSession } = await import("@/lib/session");
    expect(await getSession()).toBeNull();
  });

  it("getSession returns null for a CLIENT token (not staff)", async () => {
    cookieStore.set("admin_session", { value: CLIENT_JWT, opts: {} });
    const { getSession } = await import("@/lib/session");
    expect(await getSession()).toBeNull();
  });

  it("getSession resolves an ADMIN token; token stays server-side on the session", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    const { getSession } = await import("@/lib/session");
    const s = await getSession();
    expect(s).toMatchObject({ id: "admin-uuid", email: "admin@dunes.test", role: "ADMIN" });
    expect(s?.accessToken).toBe(ADMIN_JWT); // available to server code only
  });

  it("GET /api/auth/me never leaks the token", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    const { GET } = await import("./auth/me/route");
    const body = await (await GET()).json();
    expect(body.session).toMatchObject({ role: "ADMIN" });
    expect(JSON.stringify(body)).not.toContain(ADMIN_JWT);
  });

  it("POST /api/auth/logout clears the session + refresh cookies", async () => {
    Object.assign(process.env, OIDC_ENV);
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    cookieStore.set("admin_refresh", { value: "rt", opts: {} });
    stubFetch(async () => new Response("{}", { status: 204 })); // keycloak back-channel logout
    const { POST } = await import("./auth/logout/route");
    await POST();
    expect(cookieStore.has("admin_session")).toBe(false);
    expect(cookieStore.has("admin_refresh")).toBe(false);
  });
});

// ── proxy ────────────────────────────────────────────────────────────────
describe("/api/proxy/[...path]", () => {
  const load = () => import("./proxy/[...path]/route");
  const params = (p: string[]) => ({ params: Promise.resolve({ path: p }) });

  it("401 when unauthenticated, without touching the backend", async () => {
    const f = stubFetch(async () => new Response("{}"));
    const { GET } = await load();
    const res = await GET(new Request("http://localhost:3100/api/proxy/pages"), params(["pages"]));
    expect(res.status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it("forwards an authenticated GET with a Bearer token, preserving path + query", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    const f = stubFetch(async (url, init) => {
      expect(url).toBe("https://api.dunes.test/api/reservations?status=PENDING");
      expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${ADMIN_JWT}`);
      return new Response(JSON.stringify([{ id: 1 }]), { status: 200, headers: { "content-type": "application/json" } });
    });
    const { GET } = await load();
    const res = await GET(
      new Request("http://localhost:3100/api/proxy/reservations?status=PENDING"),
      params(["reservations"]),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
    expect(f).toHaveBeenCalledOnce();
  });

  it("forwards a POST body and propagates a backend 403", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    stubFetch(async (_url, init) => {
      expect(init?.body).toBe(JSON.stringify({ title: "x" }));
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
    });
    const { POST } = await load();
    const res = await POST(
      new Request("http://localhost:3100/api/proxy/pages", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      params(["pages"]),
    );
    expect(res.status).toBe(403);
  });

  it("rejects a cross-site mutating request with 403 before the backend", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    const f = stubFetch(async () => new Response("{}"));
    const { POST } = await load();
    const res = await POST(
      new Request("http://localhost:3100/api/proxy/pages", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: "{}",
      }),
      params(["pages"]),
    );
    expect(res.status).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });

  it("a same-origin mutating request is allowed through", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    const f = stubFetch(async () => new Response("{}", { status: 200 }));
    const { POST } = await load();
    const res = await POST(
      new Request("http://localhost:3100/api/proxy/pages", {
        method: "POST",
        headers: { origin: "http://localhost:3100" },
        body: "{}",
      }),
      params(["pages"]),
    );
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledOnce();
  });
});
