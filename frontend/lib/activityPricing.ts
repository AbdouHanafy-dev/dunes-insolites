import type { Activity } from "@/lib/types";

/**
 * How many units of an activity a booking is charged for. Mirrors the server
 * (ReservationServiceImpl): per-unit and per-person activities count every
 * traveler (2 adults = 2 camel treks), per-day ones follow the nights, and
 * per-booking / per-vehicle ones are a single flat charge. Display estimate
 * only - the server computes the real total.
 */
export function activityQuantity(
  activity: Pick<Activity, "pricingUnit">,
  travelers: number,
  nights = 1,
): number {
  switch (activity.pricingUnit) {
    case "PER_BOOKING":
    case "PER_VEHICLE":
      return 1;
    case "PER_DAY":
      return Math.max(nights, 1);
    default: // PER_UNIT, PER_PERSON, or an older backend that doesn't say
      return Math.max(travelers, 1);
  }
}

export function activityTotal(
  activity: Pick<Activity, "pricingUnit" | "priceFrom">,
  travelers: number,
  nights = 1,
): number {
  return activity.priceFrom * activityQuantity(activity, travelers, nights);
}
