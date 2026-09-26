import { describe, expect, it } from "vitest";
import { parsePercent, percentLabel, promoTotals, validityOf, type AdminPromoCode } from "./promoCodes";

const code = (over: Partial<AdminPromoCode>): AdminPromoCode => ({
  promoCodeId: "1", code: "BADIRA10", partnerName: "Hôtel Badira", discountPercent: 10, commissionPercent: 5,
  validFrom: null, validUntil: null, active: true, reservations: 2, pendingReservations: 1,
  circuitRevenue: 270, discountGiven: 30, commissionDue: 13.5, ...over,
});

describe("percent helpers", () => {
  it("writes and reads percentages", () => {
    expect(percentLabel(10)).toBe("10 %");
    expect(percentLabel(12.5)).toBe("12,5 %");
    expect(percentLabel(null)).toBe("—");
    expect(parsePercent("12,5")).toBe(12.5);
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("abc")).toBeNull();
  });
});

describe("validityOf", () => {
  it("tells off, not started, running and over", () => {
    expect(validityOf(code({ active: false }), "2026-10-01").key).toBe("off");
    expect(validityOf(code({ validFrom: "2026-11-01" }), "2026-10-01").key).toBe("soon");
    expect(validityOf(code({ validUntil: "2026-09-30" }), "2026-10-01").key).toBe("over");
    expect(validityOf(code({ validUntil: "2026-12-31" }), "2026-10-01").key).toBe("live");
    expect(validityOf(code({}), "2026-10-01").label).toBe("Actif");
  });
});

describe("promoTotals", () => {
  it("adds the figures and counts codes without a commission rate", () => {
    const totals = promoTotals([code({}), code({ commissionPercent: null, commissionDue: null, reservations: 1, circuitRevenue: 100, discountGiven: 5 })]);
    expect(totals).toEqual({ reservations: 3, pending: 2, revenue: 370, discount: 35, commission: 13.5, withoutRate: 1 });
  });
});
