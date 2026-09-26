import { describe, expect, it } from "vitest";
import type { ServiceOptionCatalogItem } from "@/lib/api";
import { optionTotal, returnCityOption, visibleUpgrades } from "./tourOptions";
import { tourNights } from "./tourDuration";

const option = (over: Partial<ServiceOptionCatalogItem>): ServiceOptionCatalogItem => ({
  slug: "x", name: "x", description: null, category: "TOUR_OPTION", type: "UPGRADE", pricingUnit: "PER_PERSON_NIGHT",
  priceTtc: 30, requiresPickupLocation: false, requiresCustomerVehicle: false, pickupFields: [], requiredPickupFields: [],
  minPartySize: null, ...over,
});

describe("tourNights", () => {
  it("is the days of the circuit minus one", () => {
    expect(tourNights(null)).toBe(0);
    expect(tourNights(24)).toBe(0);
    expect(tourNights(48)).toBe(1);
    expect(tourNights(72)).toBe(2);
    expect(tourNights(26)).toBe(1);
  });
});

describe("visibleUpgrades", () => {
  const tent = option({ slug: "tent", minPartySize: 3 });
  const suite = option({ slug: "suite", minPartySize: 2 });
  const free = option({ slug: "free" });
  const returnCity = option({ slug: "ret", type: "RETURN_CITY", pricingUnit: "PER_BOOKING" });
  const guide = option({ slug: "guide", category: "GUIDE" });

  it("hides an option until the party reaches its minimum", () => {
    expect(visibleUpgrades([tent, suite, free], 1, 1).map((o) => o.slug)).toEqual(["free"]);
    expect(visibleUpgrades([tent, suite, free], 2, 1).map((o) => o.slug)).toEqual(["suite", "free"]);
    expect(visibleUpgrades([tent, suite, free], 3, 1).map((o) => o.slug)).toEqual(["tent", "suite", "free"]);
  });

  it("offers nothing on a circuit with no night, and never lists the return-city option or a guide", () => {
    expect(visibleUpgrades([tent, suite], 4, 0)).toEqual([]);
    expect(visibleUpgrades([returnCity, guide, suite], 4, 2).map((o) => o.slug)).toEqual(["suite"]);
  });
});

describe("returnCityOption", () => {
  it("finds the option that prices a typed return city", () => {
    const ret = option({ slug: "ret", type: "RETURN_CITY" });
    expect(returnCityOption([option({}), ret])).toBe(ret);
    expect(returnCityOption([option({})])).toBeUndefined();
  });
});

describe("optionTotal", () => {
  it("follows the option's pricing unit", () => {
    expect(optionTotal({ pricingUnit: "PER_PERSON_NIGHT", priceTtc: 30 }, 3, 2)).toBe(180);
    expect(optionTotal({ pricingUnit: "PER_PERSON", priceTtc: 30 }, 3, 2)).toBe(90);
    expect(optionTotal({ pricingUnit: "PER_BOOKING", priceTtc: 30 }, 3, 2)).toBe(30);
    expect(optionTotal({ pricingUnit: "PER_PERSON_NIGHT", priceTtc: null }, 3, 2)).toBe(0);
  });
});
