import { describe, expect, it } from "vitest";
import { actionLabel, actorDisplay, entityTypeLabel, isFailure, summarizeDevice } from "./auditLog";

describe("summarizeDevice", () => {
  it("tells a phone from a laptop", () => {
    expect(summarizeDevice("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/152.0.0.0 Mobile Safari/537.36"))
      .toBe("Android · Chrome");
    expect(summarizeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36 Edg/150"))
      .toBe("Windows · Edge");
  });
  it("copes with a missing or unknown agent", () => {
    expect(summarizeDevice(null)).toBe("—");
    expect(summarizeDevice("curl/8.0")).toBe("Inconnu");
  });
});

describe("labels", () => {
  it("names the action and the record type", () => {
    expect(actionLabel("DELETE", null)).toBe("Suppression");
    expect(actionLabel("ACTION", "approve")).toBe("Action · approve");
    expect(entityTypeLabel("tours")).toBe("Circuit");
    expect(entityTypeLabel("something-new")).toBe("something-new");
    expect(entityTypeLabel(null)).toBe("—");
  });
});

describe("actorDisplay", () => {
  it("prefers the name and keeps the e-mail underneath", () => {
    expect(actorDisplay({ actorName: "Support", actorEmail: "s@x.test", actorId: "1" }))
      .toEqual({ primary: "Support", secondary: "s@x.test" });
  });
  it("falls back to the e-mail, then the id", () => {
    expect(actorDisplay({ actorName: null, actorEmail: "s@x.test", actorId: "1" }))
      .toEqual({ primary: "s@x.test", secondary: null });
    expect(actorDisplay({ actorName: null, actorEmail: null, actorId: "abc" }).primary).toBe("abc");
  });
});

describe("isFailure", () => {
  it("flags refused or failed writes", () => {
    expect(isFailure(204)).toBe(false);
    expect(isFailure(403)).toBe(true);
    expect(isFailure(500)).toBe(true);
  });
});
