import type { AdminReservation } from "@/lib/api";

/** Reservations that count as real business: not cancelled, refused or expired. */
export const LIVE_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;

const isLive = (r: Pick<AdminReservation, "status">) => (LIVE_STATUSES as readonly string[]).includes(r.status);

/** What a reservation is worth: the full amount with extras when the payment summary has it. */
export const worth = (r: Pick<AdminReservation, "totalAmount" | "paymentSummary">): number =>
  r.paymentSummary?.originalTotalAmount ?? r.totalAmount ?? 0;

const dayOf = (iso: string | null | undefined) => (iso ?? "").slice(0, 10);

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export type DayPoint = { date: string; revenue: number; bookings: number };

/** One point per day for the `days` days ending on `today`: the value of what was booked that day, and how many bookings. */
export function bookedByDay(reservations: readonly AdminReservation[], today: string, days: number): DayPoint[] {
  const start = addDays(today, -(days - 1));
  const points = new Map<string, DayPoint>();
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    points.set(date, { date, revenue: 0, bookings: 0 });
  }
  for (const r of reservations) {
    if (!isLive(r)) continue;
    const point = points.get(dayOf(r.createdAt));
    if (!point) continue;
    point.revenue += worth(r);
    point.bookings += 1;
  }
  return [...points.values()];
}

/** The same series grouped in blocks of `size` days (weeks for a long period), so a curve stays readable. */
export function groupPoints(points: readonly DayPoint[], size: number): DayPoint[] {
  if (size <= 1) return [...points];
  const out: DayPoint[] = [];
  for (let i = 0; i < points.length; i += size) {
    const block = points.slice(i, i + size);
    out.push({
      date: block[0].date,
      revenue: block.reduce((s, p) => s + p.revenue, 0),
      bookings: block.reduce((s, p) => s + p.bookings, 0),
    });
  }
  return out;
}

export type Slice = { key: string; count: number };

/** How many reservations sit in each status (all of them, cancelled included). */
export function statusBreakdown(reservations: readonly AdminReservation[]): Slice[] {
  const counts = new Map<string, number>();
  for (const r of reservations) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export type Ranked = { name: string; count: number; revenue: number };

/** The best sellers: each prestation with its bookings and what they are worth, biggest first. */
export function topPrestations(reservations: readonly AdminReservation[], limit = 5): Ranked[] {
  const by = new Map<string, Ranked>();
  for (const r of reservations) {
    if (!isLive(r)) continue;
    const name = [...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType;
    const entry = by.get(name) ?? { name, count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += worth(r);
    by.set(name, entry);
  }
  return [...by.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count).slice(0, limit);
}

export type ArrivalDay = { date: string; travelers: number; bookings: number };

/** Who arrives in the next `days` days (today included): travelers per day, pending and confirmed bookings only. */
export function upcomingArrivals(reservations: readonly AdminReservation[], today: string, days: number): ArrivalDay[] {
  const out = new Map<string, ArrivalDay>();
  for (let i = 0; i < days; i += 1) {
    const date = addDays(today, i);
    out.set(date, { date, travelers: 0, bookings: 0 });
  }
  for (const r of reservations) {
    if (r.status !== "PENDING" && r.status !== "CONFIRMED") continue;
    const slot = out.get(dayOf(r.checkInDate ?? r.serviceDate));
    if (!slot) continue;
    slot.bookings += 1;
    slot.travelers += (r.numberOfAdults ?? 0) + (r.numberOfChildren ?? 0);
  }
  return [...out.values()];
}

/** Money collected and still to collect over the live reservations. */
export function paymentTotals(reservations: readonly AdminReservation[]) {
  let collected = 0;
  let remaining = 0;
  for (const r of reservations) {
    if (!isLive(r) || !r.paymentSummary) continue;
    collected += r.paymentSummary.totalPaid ?? 0;
    remaining += r.paymentSummary.remainingTotal ?? 0;
  }
  return { collected, remaining, rate: collected + remaining > 0 ? collected / (collected + remaining) : 0 };
}

export type Kpis = {
  revenue: number;
  bookings: number;
  averageBasket: number;
  toConfirm: number;
  arrivalsWeek: number;
  travelersWeek: number;
};

/** The headline figures of a period: what was booked in it, what waits for confirmation, who arrives this week. */
export function kpis(reservations: readonly AdminReservation[], today: string, periodDays: number): Kpis {
  const points = bookedByDay(reservations, today, periodDays);
  const revenue = points.reduce((s, p) => s + p.revenue, 0);
  const bookings = points.reduce((s, p) => s + p.bookings, 0);
  const week = upcomingArrivals(reservations, today, 7);
  return {
    revenue,
    bookings,
    averageBasket: bookings > 0 ? revenue / bookings : 0,
    toConfirm: reservations.filter((r) => r.status === "PENDING").length,
    arrivalsWeek: week.reduce((s, d) => s + d.bookings, 0),
    travelersWeek: week.reduce((s, d) => s + d.travelers, 0),
  };
}

/** Change against the same length of time just before: +12 means 12 % more; null when there is nothing to compare. */
export function growth(reservations: readonly AdminReservation[], today: string, periodDays: number, metric: "revenue" | "bookings"): number | null {
  const now = bookedByDay(reservations, today, periodDays).reduce((s, p) => s + p[metric], 0);
  const before = bookedByDay(reservations, addDays(today, -periodDays), periodDays).reduce((s, p) => s + p[metric], 0);
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}
