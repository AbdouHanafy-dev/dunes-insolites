import { describe, expect, it } from "vitest";
import { guestsPerTier, isPlaced, tierPerNight, tierRates, unplaced } from "@/lib/guestPricing";

const suite = { priceFrom: 80, adultPrice: 80, childPrice: 50, infantPrice: 10 };

describe("guestPricing", () => {
  it("prices each guest type at its own rate per night", () => {
    expect(tierPerNight(suite, { adults: 2, children: 1, infants: 1 })).toBe(220);
  });

  it("charges nothing for infants when the back office leaves them at 0", () => {
    expect(tierPerNight({ ...suite, infantPrice: 0 }, { adults: 1, children: 0, infants: 3 })).toBe(80);
  });

  it("falls back to the adult price for a missing child price and to free for a missing infant price", () => {
    expect(tierRates({ priceFrom: 60 })).toEqual({ adult: 60, child: 60, infant: 0 });
  });

  it("gives one tier the whole party and several tiers only what was assigned", () => {
    const party = { adults: 3, children: 1, infants: 1 };
    expect(guestsPerTier(["tent"], party, {})).toEqual({ tent: party });
    const two = guestsPerTier(["tent", "suite"], party, { tent: { adults: 2, children: 0, infants: 0 } });
    expect(two.tent).toEqual({ adults: 2, children: 0, infants: 0 });
    expect(two.suite).toEqual({ adults: 0, children: 0, infants: 0 });
  });

  it("reports who is still unplaced", () => {
    const party = { adults: 3, children: 1, infants: 1 };
    const left = unplaced(party, [{ adults: 2, children: 0, infants: 0 }, { adults: 1, children: 1, infants: 1 }]);
    expect(isPlaced(left)).toBe(true);
    expect(unplaced(party, [{ adults: 2, children: 0, infants: 0 }])).toEqual({ adults: 1, children: 1, infants: 1 });
  });
});
