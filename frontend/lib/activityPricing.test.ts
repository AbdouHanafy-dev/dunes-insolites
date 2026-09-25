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

describe("activity timing", () => {
  const quad = { pricingUnit: "PER_UNIT" as const, priceFrom: 25, baseDurationMinutes: 30, durationStepMinutes: 30, maxDurationMinutes: 120 };

  it("charges the unit price times minutes over the base", () => {
    expect(activityTotal(quad, 1, 1, 30)).toBe(25);
    expect(activityTotal(quad, 1, 1, 60)).toBe(50);
    expect(activityTotal(quad, 2, 1, 90)).toBe(150);
  });

  it("steps inside base..max and cannot extend when max equals base", async () => {
    const { stepDuration, canExtend } = await import("@/lib/activityPricing");
    expect(stepDuration(quad, 30, 1)).toBe(60);
    expect(stepDuration(quad, 30, -1)).toBe(30);
    expect(stepDuration(quad, 120, 1)).toBe(120);
    expect(canExtend({ ...quad, maxDurationMinutes: 30 })).toBe(false);
    expect(canExtend({ priceFrom: 1 } as typeof quad)).toBe(false);
  });

  it("writes a duration out in hours and minutes once it reaches an hour", async () => {
    const { formatSessionMinutes } = await import("@/lib/activityPricing");
    const labels = {
      minutes: (n: number) => `${n} minutes`,
      hours: (h: number) => (h === 1 ? "1 hour" : `${h} hours`),
      hoursMinutes: (h: number, mm: number) => `${h === 1 ? "1 hour" : `${h} hours`} and ${mm} minutes`,
    };
    expect(formatSessionMinutes(30, labels)).toBe("30 minutes");
    expect(formatSessionMinutes(59, labels)).toBe("59 minutes");
    expect(formatSessionMinutes(60, labels)).toBe("1 hour");
    expect(formatSessionMinutes(90, labels)).toBe("1 hour and 30 minutes");
    expect(formatSessionMinutes(120, labels)).toBe("2 hours");
    expect(formatSessionMinutes(150, labels)).toBe("2 hours and 30 minutes");
  });
});
