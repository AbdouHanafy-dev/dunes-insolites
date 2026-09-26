import { describe, expect, it } from "vitest";
import type { ServiceOptionCatalogItem } from "@/lib/api";
import { isUpgradeAvailable, optionTotal, returnCityOption, upgradeOptions } from "./tourOptions";
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

describe("upgradeOptions", () => {
  const tent = option({ slug: "tent", minPartySize: 3 });
  const suite = option({ slug: "suite", minPartySize: 2 });
  const returnCity = option({ slug: "ret", type: "RETURN_CITY", pricingUnit: "PER_BOOKING" });
  const guide = option({ slug: "guide", category: "GUIDE" });

  it("lists every upgrade whatever the party, so a small group still sees them", () => {
    expect(upgradeOptions([tent, suite], 1).map((o) => o.slug)).toEqual(["tent", "suite"]);
  });

  it("lists nothing on a circuit with no night, and never the return-city option or a guide", () => {
    expect(upgradeOptions([tent, suite], 0)).toEqual([]);
    expect(upgradeOptions([returnCity, guide, suite], 2).map((o) => o.slug)).toEqual(["suite"]);
  });
});

describe("isUpgradeAvailable", () => {
  it("opens an option once the party reaches its minimum", () => {
    const tent = option({ minPartySize: 3 });
    expect(isUpgradeAvailable(tent, 1)).toBe(false);
    expect(isUpgradeAvailable(tent, 2)).toBe(false);
    expect(isUpgradeAvailable(tent, 3)).toBe(true);
  });
  it("is always available without a minimum", () => {
    expect(isUpgradeAvailable(option({ minPartySize: null }), 1)).toBe(true);
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
