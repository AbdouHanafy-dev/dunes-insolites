import type { AdminExtra, AdminReservation, AdminReservationExtra } from "@/lib/api";

/** The circuit options (upgrades, other return city) already on a reservation. */
export function bookedOptions(reservation: Pick<AdminReservation, "extras">): AdminReservationExtra[] {
  return (reservation.extras ?? []).filter((line) => line.category === "TOUR_OPTION" && !line.resourceAllocation);
}

/** Upgrades the team can add: active circuit options, without the "other return city" charge. */
export function selectableUpgrades(catalogue: readonly AdminExtra[]): AdminExtra[] {
  return catalogue
    .filter((extra) => extra.category === "TOUR_OPTION" && extra.isActive && extra.serviceType !== "RETURN_CITY")
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function partySize(reservation: Pick<AdminReservation, "numberOfAdults" | "numberOfChildren">): number {
  return Math.max(1, (reservation.numberOfAdults ?? 0) + (reservation.numberOfChildren ?? 0));
}

/** An upgrade the party is too small for stays visible but cannot be picked. */
export function upgradeBlockedReason(option: Pick<AdminExtra, "minPartySize">, party: number): string | null {
  return option.minPartySize != null && party < option.minPartySize
    ? `À partir de ${option.minPartySize} voyageurs`
    : null;
}

/**
 * Nights an existing per-person-per-night line covers (its stored quantity is people x nights),
 * or the stay's own nights, or 1 - the starting value of the nights field.
 */
export function defaultNights(
  line: Pick<AdminReservationExtra, "quantity"> | undefined,
  party: number,
  stayNights: number | null | undefined,
): number {
  if (line?.quantity && party > 0 && line.quantity >= party) return Math.max(1, Math.round(line.quantity / party));
  return Math.max(1, stayNights ?? 1);
}

/** Nights a circuit crosses: its days minus one (48 h = 1, 72 h = 2); 0 for a single day. */
export function circuitNights(hours: number | null | undefined): number {
  if (hours == null || hours <= 24) return 0;
  return Math.ceil(hours / 24) - 1;
}

/**
 * The priced lines a new circuit booking sends for its options: each ticked upgrade (nights for a
 * per-person-per-night one) and, for a typed return city, the catalogue's "other return city" charge.
 * The server prices them; only ids and counts travel.
 */
export function circuitOptionLines(
  catalogue: readonly AdminExtra[],
  upgradeIds: readonly string[],
  nights: number,
  returnCityOther: string,
): { extraId: string; quantity: number }[] {
  const lines = selectableUpgrades(catalogue)
    .filter((u) => upgradeIds.includes(u.extraId))
    .map((u) => ({ extraId: u.extraId, quantity: u.pricingUnit === "PER_PERSON_NIGHT" ? Math.max(1, nights) : 1 }));
  if (returnCityOther.trim()) {
    const charge = catalogue.find((e) => e.category === "TOUR_OPTION" && e.isActive && e.serviceType === "RETURN_CITY");
    if (charge) lines.push({ extraId: charge.extraId, quantity: 1 });
  }
  return lines;
}
