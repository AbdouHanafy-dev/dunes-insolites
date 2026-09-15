import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/api";
  delete process.env.MAINTENANCE_FAIL_CLOSED;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("maintenance middleware security", () => {
  it("removes query-controlled content from direct maintenance URLs", async () => {
    const { default: middleware } = await import("../middleware");
    const request = new NextRequest(
      "https://www.dunes-insolites.com/maintenance/?msg=FAKE&endsAt=2099-01-01",
      { headers: { "x-dunes-maintenance-message": "FAKE" } },
    );

    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.dunes-insolites.com/maintenance/");
  });

  it("strips forged internal maintenance headers on a clean direct visit", async () => {
    const { default: middleware } = await import("../middleware");
    const request = new NextRequest("https://www.dunes-insolites.com/maintenance/", {
      headers: { "x-dunes-maintenance-message": "FAKE" },
    });

    const response = await middleware(request);
    expect(response.headers.get("x-middleware-override-headers")).not.toContain(
      "x-dunes-maintenance-message",
    );
    expect(response.headers.get("x-middleware-request-x-dunes-maintenance-message")).toBeNull();
  });

  it("injects only the active backend record into an internal rewrite", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{
      path: "/fr/about/",
      message: "Message officiel",
      endsAt: "2099-01-01T00:00:00",
    }]), { status: 200 })));
    const { default: middleware } = await import("../middleware");
    const request = new NextRequest("https://www.dunes-insolites.com/fr/about/?msg=FAKE", {
      headers: { "x-dunes-maintenance-message": "FAKE" },
    });

    const response = await middleware(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-rewrite")).not.toContain("msg=");
    expect(response.headers.get("x-middleware-request-x-dunes-maintenance-message"))
      .toBe("Message officiel");
  });

  it("fails closed in production mode when the maintenance API is unavailable", async () => {
    process.env.MAINTENANCE_FAIL_CLOSED = "true";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { default: middleware } = await import("../middleware");

    const response = await middleware(
      new NextRequest("https://www.dunes-insolites.com/fr/about/"),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-rewrite")).toContain("/maintenance/");
  });
});
