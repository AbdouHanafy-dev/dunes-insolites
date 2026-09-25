import { describe, expect, it } from "vitest";
import { formatTourDuration, isMultiDayTour } from "./tourDuration";

const t = (_key: "format", v: { hours: number; days: number; rest: number }) => `${v.days}d${v.rest}r${v.hours}h`;

describe("tourDuration", () => {
  it("passes hours, days and remainder to the message", () => {
    expect(formatTourDuration(t, { duration: "x", durationHours: 26 })).toBe("1d2r26h");
  });
  it("falls back to the server label without hours", () => {
    expect(formatTourDuration(t, { duration: "2 jours (48 h)", durationHours: null })).toBe("2 jours (48 h)");
  });
  it("is multi-day only past 24 h", () => {
    expect(isMultiDayTour({ durationHours: 24 })).toBe(false);
    expect(isMultiDayTour({ durationHours: 25 })).toBe(true);
    expect(isMultiDayTour({ durationHours: null })).toBe(false);
  });
});
