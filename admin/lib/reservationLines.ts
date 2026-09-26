import type { AdminReservation, AdminReservationExtra } from "@/lib/api";

type WithExtras = Pick<AdminReservation, "extras">;

/** What the guest bought on top of the stay or circuit, without the internal resource rows. */
const visible = (r: WithExtras): AdminReservationExtra[] => (r.extras ?? []).filter((line) => !line.resourceAllocation);

/** The activities the guest chose (camel trek, quad, sandboarding...). */
export function activityLines(r: WithExtras): AdminReservationExtra[] {
  return visible(r).filter((line) => line.category === "ACTIVITY");
}

/** Paid upgrades and the other-return-city charge. */
export function optionLines(r: WithExtras): AdminReservationExtra[] {
  return visible(r).filter((line) => line.category === "TOUR_OPTION");
}

/** Guide, vehicle and any other line that is neither an activity nor a circuit option. */
export function serviceLines(r: WithExtras): AdminReservationExtra[] {
  return visible(r).filter((line) => line.category !== "ACTIVITY" && line.category !== "TOUR_OPTION");
}

/** "Balade à dos de chameau", "Quad × 2": the name, with the quantity when there is more than one. */
export function lineLabel(line: Pick<AdminReservationExtra, "name" | "quantity">): string {
  return line.quantity != null && line.quantity > 1 ? `${line.name} × ${line.quantity}` : line.name;
}

/** The activities for a table cell, e.g. "Camel trek · Quad safari"; empty when none. */
export function activitySummary(r: WithExtras): string {
  return activityLines(r).map(lineLabel).join(" · ");
}
