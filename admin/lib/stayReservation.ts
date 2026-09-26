import type { AdminReservation } from "@/lib/api";

type StayFacts = Pick<AdminReservation, "numberOfAdults" | "numberOfChildren" | "numberOfInfants" | "tourTypes" | "checkInDate" | "checkOutDate">;

const n = (value: number | null | undefined): number => value ?? 0;

/** Who is coming: adults + children are the travelers; infants are listed apart (they take no place). */
export function guestCounts(r: Pick<AdminReservation, "numberOfAdults" | "numberOfChildren" | "numberOfInfants">) {
  const adults = n(r.numberOfAdults);
  const children = n(r.numberOfChildren);
  const infants = n(r.numberOfInfants);
  return { adults, children, infants, coming: adults + children };
}

/** "2 adultes · 1 enfant · 1 bébé", nothing for a zero. */
export function guestBreakdown(r: Pick<AdminReservation, "numberOfAdults" | "numberOfChildren" | "numberOfInfants">): string {
  const { adults, children, infants } = guestCounts(r);
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adulte${adults > 1 ? "s" : ""}`);
  if (children > 0) parts.push(`${children} enfant${children > 1 ? "s" : ""}`);
  if (infants > 0) parts.push(`${infants} bébé${infants > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

/**
 * The accommodation booked, as the team says it: "Tente × 1", "Suite × 2". The same tier on
 * several lines is added up. Empty when the stay has no tier recorded (an older booking).
 */
export function accommodationSummary(r: Pick<AdminReservation, "tourTypes">): string {
  const totals = new Map<string, number>();
  for (const line of r.tourTypes) {
    for (const tier of line.accommodations ?? []) {
      const name = tier.accommodationName?.trim();
      if (!name) continue;
      totals.set(name, (totals.get(name) ?? 0) + Math.max(n(tier.accommodationUnits), 1));
    }
  }
  return [...totals].map(([name, units]) => `${name} × ${units}`).join(" · ");
}

/** Nights of the stay: the line's own count, else the gap between arrival and departure; null when unknown. */
export function nightsOf(r: Pick<StayFacts, "tourTypes" | "checkInDate" | "checkOutDate">): number | null {
  const fromLine = r.tourTypes.map((line) => line.numberOfNights).find((v) => v != null && v > 0);
  if (fromLine != null) return fromLine;
  if (r.checkInDate && r.checkOutDate) {
    const days = Math.round((Date.parse(r.checkOutDate) - Date.parse(r.checkInDate)) / 86_400_000);
    if (Number.isFinite(days) && days > 0) return days;
  }
  return null;
}
