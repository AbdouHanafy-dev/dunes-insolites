import { describe, expect, it } from "vitest";
import { bookedOptions, circuitNights, circuitOptionLines, defaultNights, partySize, selectableUpgrades, upgradeBlockedReason } from "./circuitOptions";
import type { AdminExtra, AdminReservationExtra } from "./api";

const line = (over: Partial<AdminReservationExtra>): AdminReservationExtra => ({
  reservationExtraId: "l1", name: "Suite", quantity: 4, unitPrice: 30, totalPrice: 120,
  category: "TOUR_OPTION", serviceType: "UPGRADE", selectedExtraId: "e1", resourceAllocation: false, ...over,
});
const extra = (over: Partial<AdminExtra>) => ({ extraId: "e1", name: "Suite", isActive: true, displayOrder: 0,
  category: "TOUR_OPTION", serviceType: "UPGRADE", minPartySize: null, ...over }) as AdminExtra;

describe("bookedOptions", () => {
  it("keeps only circuit options, not activities or resource rows", () => {
    const r = { extras: [line({}), line({ category: "ACTIVITY" }), line({ resourceAllocation: true })] };
    expect(bookedOptions(r)).toHaveLength(1);
    expect(bookedOptions({})).toEqual([]);
  });
});

describe("selectableUpgrades", () => {
  it("drops inactive options and the return-city charge", () => {
    const list = selectableUpgrades([extra({}), extra({ extraId: "e2", isActive: false }), extra({ extraId: "e3", serviceType: "RETURN_CITY" }), extra({ extraId: "e4", category: "ACTIVITY" })]);
    expect(list.map((e) => e.extraId)).toEqual(["e1"]);
  });
});

describe("party rules", () => {
  it("counts adults and children, at least one", () => {
    expect(partySize({ numberOfAdults: 2, numberOfChildren: 1 })).toBe(3);
    expect(partySize({})).toBe(1);
  });
  it("blocks an upgrade the party is too small for", () => {
    expect(upgradeBlockedReason({ minPartySize: 2 }, 1)).toBe("À partir de 2 voyageurs");
    expect(upgradeBlockedReason({ minPartySize: 2 }, 2)).toBeNull();
    expect(upgradeBlockedReason({ minPartySize: null }, 1)).toBeNull();
  });
});

describe("defaultNights", () => {
  it("reads nights back from people x nights", () => {
    expect(defaultNights(line({ quantity: 6 }), 2, 1)).toBe(3);
  });
  it("falls back to the stay's nights, then 1", () => {
    expect(defaultNights(undefined, 2, 2)).toBe(2);
    expect(defaultNights(undefined, 2, null)).toBe(1);
  });
});

describe("circuitNights", () => {
  it("counts the nights a circuit crosses", () => {
    expect(circuitNights(24)).toBe(0);
    expect(circuitNights(48)).toBe(1);
    expect(circuitNights(72)).toBe(2);
    expect(circuitNights(null)).toBe(0);
  });
});

describe("circuitOptionLines", () => {
  const catalogue = [
    extra({ extraId: "up", pricingUnit: "PER_PERSON_NIGHT" }),
    extra({ extraId: "ret", serviceType: "RETURN_CITY", pricingUnit: "PER_BOOKING" }),
  ];
  it("sends the nights for a per-night upgrade and adds the return-city charge for a typed city", () => {
    expect(circuitOptionLines(catalogue, ["up"], 2, "Gabès")).toEqual([
      { extraId: "up", quantity: 2 },
      { extraId: "ret", quantity: 1 },
    ]);
  });
  it("sends nothing for an untouched form", () => {
    expect(circuitOptionLines(catalogue, [], 2, "  ")).toEqual([]);
  });
  it("ignores an id that is not a selectable upgrade", () => {
    expect(circuitOptionLines(catalogue, ["ret", "zzz"], 1, "")).toEqual([]);
  });
});
