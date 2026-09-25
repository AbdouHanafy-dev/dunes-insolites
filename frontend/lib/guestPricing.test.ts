import { describe, expect, it } from "vitest";
import { guestsPerTier, isPlaced, sortByPrice, tierPerNight, tierRates, unplaced } from "@/lib/guestPricing";

const suite = { priceFrom: 80, adultPrice: 80, childPrice: 50, infantPrice: 10 };

describe("sortByPrice", () => {
  const tier = (name: string, priceFrom: number, adultPrice?: number) => ({ name, priceFrom, adultPrice });

  it("puts the cheapest tier first, using the adult price when it is set", () => {
    const sorted = sortByPrice([tier("suite", 220), tier("tent", 999, 130), tier("room", 150)]);
    expect(sorted.map((t) => t.name)).toEqual(["tent", "room", "suite"]);
  });

  it("keeps the back-office order for equal prices and never mutates its input", () => {
    const input = [tier("b", 100), tier("a", 100), tier("c", 50)];
    expect(sortByPrice(input).map((t) => t.name)).toEqual(["c", "b", "a"]);
    expect(input.map((t) => t.name)).toEqual(["b", "a", "c"]);
  });
});

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
