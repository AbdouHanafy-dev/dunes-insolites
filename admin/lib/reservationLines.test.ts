import { describe, expect, it } from "vitest";
import { activityLines, activitySummary, lineLabel, optionLines, serviceLines } from "./reservationLines";
import type { AdminReservationExtra } from "./api";

const line = (over: Partial<AdminReservationExtra>): AdminReservationExtra => ({
  reservationExtraId: "l", name: "Camel trek", quantity: 1, unitPrice: 50, totalPrice: 50,
  category: "ACTIVITY", serviceType: null, selectedExtraId: null, resourceAllocation: false, ...over,
});

const r = {
  extras: [
    line({}),
    line({ name: "Quad safari", quantity: 2 }),
    line({ name: "Camel (resource)", resourceAllocation: true }),
    line({ name: "Suite", category: "TOUR_OPTION" }),
    line({ name: "Guide", category: "GUIDE" }),
  ],
};

describe("reservation lines", () => {
  it("splits activities, options and services, hiding resource rows", () => {
    expect(activityLines(r).map((l) => l.name)).toEqual(["Camel trek", "Quad safari"]);
    expect(optionLines(r).map((l) => l.name)).toEqual(["Suite"]);
    expect(serviceLines(r).map((l) => l.name)).toEqual(["Guide"]);
  });
  it("writes the quantity only when there is more than one", () => {
    expect(lineLabel({ name: "Quad", quantity: 2 })).toBe("Quad × 2");
    expect(lineLabel({ name: "Quad", quantity: 1 })).toBe("Quad");
    expect(lineLabel({ name: "Quad", quantity: null })).toBe("Quad");
  });
  it("summarises the activities for a table cell", () => {
    expect(activitySummary(r)).toBe("Camel trek · Quad safari × 2");
    expect(activitySummary({})).toBe("");
  });
});
