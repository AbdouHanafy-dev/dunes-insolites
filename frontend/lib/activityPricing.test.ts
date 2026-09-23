import { describe, expect, it } from "vitest";
import { activityQuantity, activityTotal } from "@/lib/activityPricing";

describe("activityPricing", () => {
  it("charges per-unit and per-person activities once per traveler", () => {
    expect(activityQuantity({ pricingUnit: "PER_UNIT" }, 2)).toBe(2);
    expect(activityQuantity({ pricingUnit: "PER_PERSON" }, 3)).toBe(3);
    expect(activityTotal({ pricingUnit: "PER_UNIT", priceFrom: 45 }, 2)).toBe(90);
  });

  it("treats an activity with no unit like per-unit (older backend)", () => {
    expect(activityTotal({ priceFrom: 35 }, 4)).toBe(140);
  });

  it("keeps per-booking and per-vehicle activities flat", () => {
    expect(activityTotal({ pricingUnit: "PER_BOOKING", priceFrom: 10 }, 5)).toBe(10);
    expect(activityTotal({ pricingUnit: "PER_VEHICLE", priceFrom: 60 }, 5)).toBe(60);
  });

  it("follows the nights for per-day activities and never drops below one", () => {
    expect(activityTotal({ pricingUnit: "PER_DAY", priceFrom: 20 }, 2, 3)).toBe(60);
    expect(activityQuantity({ pricingUnit: "PER_UNIT" }, 0)).toBe(1);
  });
});
