import { describe, expect, it } from "vitest";
import { accommodationSummary, guestBreakdown, guestCounts, nightsOf } from "./stayReservation";

const tier = (accommodationName: string, accommodationUnits: number) => ({ accommodationName, accommodationUnits });

describe("guests", () => {
  it("counts adults and children as the travelers and keeps infants apart", () => {
    expect(guestCounts({ numberOfAdults: 2, numberOfChildren: 2, numberOfInfants: 1 })).toEqual({
      adults: 2, children: 2, infants: 1, coming: 4,
    });
  });
  it("copes with missing numbers", () => {
    expect(guestCounts({ numberOfAdults: null, numberOfChildren: null, numberOfInfants: null }).coming).toBe(0);
  });
  it("writes the breakdown without zeros and with plurals", () => {
    expect(guestBreakdown({ numberOfAdults: 2, numberOfChildren: 1, numberOfInfants: 0 })).toBe("2 adultes · 1 enfant");
    expect(guestBreakdown({ numberOfAdults: 1, numberOfChildren: 0, numberOfInfants: 2 })).toBe("1 adulte · 2 bébés");
  });
});

describe("accommodationSummary", () => {
  it("says the tier and how many, like the team does", () => {
    const r = { tourTypes: [{ name: "Nuit", totalPrice: 1, accommodations: [tier("Tente", 1)] }] };
    expect(accommodationSummary(r)).toBe("Tente × 1");
  });
  it("lists several tiers and adds up the same tier across lines", () => {
    const r = {
      tourTypes: [
        { name: "Nuit", totalPrice: 1, accommodations: [tier("Suite", 2), tier("Tente", 1)] },
        { name: "Nuit 2", totalPrice: 1, accommodations: [tier("Suite", 1)] },
      ],
    };
    expect(accommodationSummary(r)).toBe("Suite × 3 · Tente × 1");
  });
  it("is empty when nothing is recorded", () => {
    expect(accommodationSummary({ tourTypes: [{ name: "Nuit", totalPrice: 1 }] })).toBe("");
    expect(accommodationSummary({ tourTypes: [] })).toBe("");
  });
});

describe("nightsOf", () => {
  it("uses the stay line's own count first", () => {
    expect(nightsOf({ tourTypes: [{ name: "x", totalPrice: 1, numberOfNights: 3 }], checkInDate: null, checkOutDate: null })).toBe(3);
  });
  it("falls back to the gap between arrival and departure", () => {
    expect(nightsOf({ tourTypes: [], checkInDate: "2026-10-05", checkOutDate: "2026-10-07" })).toBe(2);
  });
  it("is null when it cannot be known", () => {
    expect(nightsOf({ tourTypes: [], checkInDate: null, checkOutDate: null })).toBeNull();
  });
});
