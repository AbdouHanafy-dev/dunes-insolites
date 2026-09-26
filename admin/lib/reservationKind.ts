import type { AdminReservation } from "@/lib/api";

/** Which reservations a backoffice list shows. */
export type ReservationKind = "all" | "stays" | "circuits";

/** A circuit booking: the reservation has at least one circuit line. */
export function isCircuitReservation(r: Pick<AdminReservation, "tours">): boolean {
  return r.tours.length > 0;
}

/** An accommodation booking (a night at the camp): at least one stay line. */
export function isStayReservation(r: Pick<AdminReservation, "tourTypes">): boolean {
  return r.tourTypes.length > 0;
}

/**
 * Keeps the reservations of one kind. A booking that mixes both appears in both lists;
 * nothing is hidden from "all".
 */
export function ofKind<T extends Pick<AdminReservation, "tours" | "tourTypes">>(list: T[], kind: ReservationKind): T[] {
  if (kind === "circuits") return list.filter(isCircuitReservation);
  if (kind === "stays") return list.filter(isStayReservation);
  return list;
}
