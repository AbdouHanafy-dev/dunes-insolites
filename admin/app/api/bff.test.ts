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
  delete: (name: string) => cookieStore.delete(name),
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

// ── login ────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("sets an httpOnly SameSite=Strict cookie and returns NO token to the client", async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify({ accessToken: ADMIN_JWT, userId: "admin-uuid", name: "Ada Admin", email: "admin@dunes.test", expiresIn: 300 }),
        { status: 200 },
      ),
    );
    const { POST } = await import("./auth/login/route");
    const res = await POST(new Request("http://localhost:3100/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@dunes.test", password: "pw" }),
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ id: "admin-uuid", name: "Ada Admin", email: "admin@dunes.test", role: "ADMIN" });
    expect(JSON.stringify(body)).not.toContain(ADMIN_JWT);
    expect(JSON.stringify(body).toLowerCase()).not.toContain("token");

    const cookie = cookieStore.get("admin_session");
    expect(cookie?.value).toBe(ADMIN_JWT);
    expect(cookie?.opts.httpOnly).toBe(true);
    expect(cookie?.opts.sameSite).toBe("strict");
    expect(cookie?.opts.path).toBe("/");
  });

  it("rejects a non-staff (CLIENT) account with 403 and sets no cookie", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ accessToken: CLIENT_JWT, userId: "x", email: "c@dunes.test" }), { status: 200 }),
    );
    const { POST } = await import("./auth/login/route");
    const res = await POST(new Request("http://localhost:3100/api/auth/login", {
      method: "POST", body: JSON.stringify({ email: "c@dunes.test", password: "pw" }),
    }));
    expect(res.status).toBe(403);
    expect(cookieStore.has("admin_session")).toBe(false);
  });

  it("propagates a backend credential rejection (401)", async () => {
    stubFetch(async () => new Response(JSON.stringify({ message: "bad creds" }), { status: 401 }));
    const { POST } = await import("./auth/login/route");
    const res = await POST(new Request("http://localhost:3100/api/auth/login", {
      method: "POST", body: JSON.stringify({ email: "a@b.c", password: "wrong" }),
    }));
    expect(res.status).toBe(401);
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

  it("POST /api/auth/logout clears the session cookie", async () => {
    cookieStore.set("admin_session", { value: ADMIN_JWT, opts: {} });
    const { POST } = await import("./auth/logout/route");
    await POST();
    expect(cookieStore.has("admin_session")).toBe(false);
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
