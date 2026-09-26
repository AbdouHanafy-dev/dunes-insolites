import { describe, expect, it } from "vitest";
import {
  addDays, bookedByDay, groupPoints, growth, kpis, paymentTotals, statusBreakdown, topPrestations, upcomingArrivals,
} from "./dashboardData";
import type { AdminReservation } from "./api";

const TODAY = "2026-10-10";

const res = (over: Partial<AdminReservation>): AdminReservation =>
  ({
    reservationId: "r", userName: "x", reservationType: "TOURS", status: "CONFIRMED", checkInDate: null, checkOutDate: null,
    serviceDate: "2026-10-12", arrivalMode: null, departureCity: null, totalAmount: 100, currency: "EUR",
    createdAt: "2026-10-09T10:00:00", numberOfAdults: 2, numberOfChildren: 1, tourTypes: [], tours: [{ name: "Circuit A", totalPrice: 100 }],
    paymentSummary: null, ...over,
  }) as AdminReservation;

describe("bookedByDay", () => {
  it("gives one point per day, filling the empty days", () => {
    const points = bookedByDay([res({})], TODAY, 3);
    expect(points.map((p) => p.date)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"]);
    expect(points[1]).toMatchObject({ revenue: 100, bookings: 1 });
    expect(points[0]).toMatchObject({ revenue: 0, bookings: 0 });
  });
  it("leaves out cancelled, refused and expired bookings, and those outside the period", () => {
    const points = bookedByDay(
      [res({ status: "CANCELLED" }), res({ status: "REJECTED" }), res({ createdAt: "2026-01-01T00:00:00" })],
      TODAY, 3,
    );
    expect(points.every((p) => p.bookings === 0)).toBe(true);
  });
  it("values a booking with its extras when the payment summary has the total", () => {
    const points = bookedByDay([res({ paymentSummary: { originalTotalAmount: 150, totalPaid: 0, remainingTotal: 150, paymentStatus: "UNPAID" } })], TODAY, 2);
    expect(points[0].revenue).toBe(150);
  });
});

describe("groupPoints", () => {
  it("adds days up in blocks", () => {
    const points = bookedByDay([res({})], TODAY, 4);
    const weeks = groupPoints(points, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[1]).toMatchObject({ date: "2026-10-09", revenue: 100, bookings: 1 });
  });
});

describe("breakdowns", () => {
  it("counts statuses, biggest first", () => {
    expect(statusBreakdown([res({}), res({}), res({ status: "PENDING" })])).toEqual([
      { key: "CONFIRMED", count: 2 }, { key: "PENDING", count: 1 },
    ]);
  });
  it("ranks the prestations by what they are worth", () => {
    const top = topPrestations([
      res({ tours: [{ name: "Circuit A", totalPrice: 1 }], totalAmount: 100 }),
      res({ tours: [{ name: "Circuit B", totalPrice: 1 }], totalAmount: 300 }),
      res({ tours: [{ name: "Circuit A", totalPrice: 1 }], totalAmount: 100 }),
      res({ tours: [{ name: "Circuit C", totalPrice: 1 }], totalAmount: 900, status: "CANCELLED" }),
    ], 2);
    expect(top.map((t) => t.name)).toEqual(["Circuit B", "Circuit A"]);
    expect(top[1]).toMatchObject({ count: 2, revenue: 200 });
  });
});

describe("upcomingArrivals", () => {
  it("adds up travelers per arrival day for pending and confirmed bookings", () => {
    const days = upcomingArrivals([res({}), res({ status: "PENDING" }), res({ status: "CANCELLED" })], TODAY, 4);
    expect(days.map((d) => d.date)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"]);
    expect(days[2]).toMatchObject({ bookings: 2, travelers: 6 });
  });
  it("reads a stay's arrival from its check-in date", () => {
    const days = upcomingArrivals([res({ reservationType: "HEBERGEMENT", checkInDate: "2026-10-11", serviceDate: null })], TODAY, 3);
    expect(days[1].bookings).toBe(1);
  });
});

describe("payments and kpis", () => {
  it("adds what is collected and what remains", () => {
    const paid = res({ paymentSummary: { originalTotalAmount: 100, totalPaid: 40, remainingTotal: 60, paymentStatus: "PARTIALLY_PAID" } });
    const totals = paymentTotals([paid, res({ status: "CANCELLED", paymentSummary: { originalTotalAmount: 100, totalPaid: 100, remainingTotal: 0, paymentStatus: "PAID" } })]);
    expect(totals).toEqual({ collected: 40, remaining: 60, rate: 0.4 });
  });
  it("sums a period, the average basket and this week's arrivals", () => {
    const k = kpis([res({}), res({ status: "PENDING", totalAmount: 300 })], TODAY, 7);
    expect(k).toMatchObject({ revenue: 400, bookings: 2, averageBasket: 200, toConfirm: 1, arrivalsWeek: 2, travelersWeek: 6 });
  });
  it("compares with the period just before, and stays null without a base", () => {
    const before = res({ createdAt: "2026-10-05T10:00:00", totalAmount: 100 });
    const now = res({ createdAt: "2026-10-09T10:00:00", totalAmount: 150 });
    expect(growth([before, now], TODAY, 5, "revenue")).toBe(50);
    expect(growth([now], TODAY, 5, "revenue")).toBeNull();
  });
  it("moves dates by days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
