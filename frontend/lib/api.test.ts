import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Production-hardening item 3 — the data seam must FAIL CLOSED.
 *
 * `lib/api.ts` reads its config (NEXT_PUBLIC_API_URL, ALLOW_SEED_FALLBACK) at
 * module load, so each case resets modules and env and re-imports.
 */

const ORIGINAL_ENV = { ...process.env };

async function loadApi() {
  vi.resetModules();
  return import("./api");
}

function setEnv(env: Record<string, string | undefined>) {
  for (const k of ["NEXT_PUBLIC_API_URL", "ALLOW_SEED_FALLBACK", "NEXT_PUBLIC_ALLOW_SEED_FALLBACK"]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("lib/api fail-closed behaviour", () => {
  it("production + valid API + reachable backend → returns live data", async () => {
    setEnv({ NEXT_PUBLIC_API_URL: "https://api.example.test" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ activities: [{ slug: "live-one" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const api = await loadApi();
    const activities = await api.getActivities();
    expect(activities).toEqual([{ slug: "live-one" }]);
  });

  it("production + NEXT_PUBLIC_API_URL missing → throws, never serves seed", async () => {
    setEnv({});
    const api = await loadApi();
    await expect(api.getActivities()).rejects.toThrowError(api.MisconfiguredBackendError);
    await expect(api.getStays()).rejects.toThrowError(/NEXT_PUBLIC_API_URL is not set/);
    await expect(api.getRedirects()).rejects.toThrowError(api.MisconfiguredBackendError);
  });

  it("production + backend configured but failing → empty state, NOT seed data", async () => {
    setEnv({ NEXT_PUBLIC_API_URL: "https://api.example.test" });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));

    const api = await loadApi();
    const activities = await api.getActivities();
    const stays = await api.getStays();
    const reviews = await api.getReviews();

    expect(activities).toEqual([]);
    expect(stays).toEqual([]);
    expect(reviews).toEqual([]);
    expect(errSpy).toHaveBeenCalled(); // loud, not silent
  });

  it("production + backend returns 500 → empty state, NOT seed data", async () => {
    setEnv({ NEXT_PUBLIC_API_URL: "https://api.example.test" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));

    const api = await loadApi();
    expect(await api.getActivities()).toEqual([]);
  });

  it("development + explicit ALLOW_SEED_FALLBACK opt-in → seed data is served", async () => {
    setEnv({ ALLOW_SEED_FALLBACK: "true" });
    const api = await loadApi();
    const activities = await api.getActivities();
    expect(activities.length).toBeGreaterThan(0);
    expect(api.usingRemoteApi).toBe(false);
  });

  it("development without opt-in → same safe default as production (throws)", async () => {
    setEnv({});
    const api = await loadApi();
    await expect(api.getActivities()).rejects.toThrowError(api.MisconfiguredBackendError);
  });

  it("opt-in + configured backend that fails → seed (dev convenience), still not blank", async () => {
    setEnv({ NEXT_PUBLIC_API_URL: "https://api.example.test", ALLOW_SEED_FALLBACK: "true" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const api = await loadApi();
    expect((await api.getActivities()).length).toBeGreaterThan(0);
  });
});

describe("getStayAvailability (Phase 2)", () => {
  it("returns null with no backend configured (dev) — form treats tiers as bookable", async () => {
    setEnv({ ALLOW_SEED_FALLBACK: "true" });
    const api = await loadApi();
    expect(await api.getStayAvailability("nuitee-campement-desert", "2026-09-20")).toBeNull();
  });

  it("returns the backend's per-tier availability when configured", async () => {
    setEnv({ NEXT_PUBLIC_API_URL: "https://api.example.test" });
    const payload = {
      staySlug: "nuitee-campement-desert",
      date: "2026-09-20",
      accommodations: [
        { slug: "desert-tent", name: "Tent", status: "AVAILABLE", unitsAvailable: 2 },
        { slug: "dune-suite", name: "Suite", status: "UNAVAILABLE", unitsAvailable: 0 },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } })));
    const api = await loadApi();
    const a = await api.getStayAvailability("nuitee-campement-desert", "2026-09-20");
    expect(a?.accommodations.find((t) => t.slug === "dune-suite")?.status).toBe("UNAVAILABLE");
  });

  it("production + backend failure → null (never fake availability)", async () => {
    setEnv({ NEXT_PUBLIC_API_URL: "https://api.example.test" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const api = await loadApi();
    expect(await api.getStayAvailability("x", "2026-09-20")).toBeNull();
  });
});

describe("seed route guard", () => {
  it("returns a 503 Response when seed fallback is not enabled", async () => {
    setEnv({});
    vi.resetModules();
    const { seedRouteDisabled } = await import("./seedGuard");
    const res = seedRouteDisabled();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it("returns null (route allowed) when opted in", async () => {
    setEnv({ ALLOW_SEED_FALLBACK: "true" });
    vi.resetModules();
    const { seedRouteDisabled } = await import("./seedGuard");
    expect(seedRouteDisabled()).toBeNull();
  });
});
