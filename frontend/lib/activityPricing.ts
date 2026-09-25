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
  activity: Pick<Activity, "pricingUnit" | "priceFrom"> & ActivityTiming,
  travelers: number,
  nights = 1,
  minutes?: number,
): number {
  const total = activity.priceFrom * activityQuantity(activity, travelers, nights) * durationFactor(activity, minutes);
  return Math.round(total * 100) / 100;
}

/** Back-office timing of a timed activity, all in minutes. */
export type ActivityTiming = Pick<
  Activity,
  "baseDurationMinutes" | "durationStepMinutes" | "maxDurationMinutes"
>;

export const DEFAULT_ACTIVITY_MINUTES = 30;

export function baseMinutes(activity: ActivityTiming): number {
  return activity.baseDurationMinutes ?? DEFAULT_ACTIVITY_MINUTES;
}

function stepMinutes(activity: ActivityTiming): number {
  return activity.durationStepMinutes ?? DEFAULT_ACTIVITY_MINUTES;
}

/** The longest session the guest may book; the base itself when the back office allows no extension. */
export function maxMinutes(activity: ActivityTiming): number {
  return Math.max(activity.maxDurationMinutes ?? baseMinutes(activity), baseMinutes(activity));
}

export function canExtend(activity: ActivityTiming): boolean {
  return maxMinutes(activity) > baseMinutes(activity);
}

/** Next/previous allowed duration, kept inside [base, max] and on the back-office step. */
export function stepDuration(activity: ActivityTiming, current: number, direction: 1 | -1): number {
  const next = current + direction * stepMinutes(activity);
  return Math.min(Math.max(next, baseMinutes(activity)), maxMinutes(activity));
}

/**
 * Label shown between the − and +, written out in hours and minutes:
 * "30 minutes", "1 hour", "1 hour and 30 minutes", "2 hours"…
 */
export function formatSessionMinutes(
  minutes: number,
  labels: { minutes: (n: number) => string; hours: (h: number) => string; hoursMinutes: (h: number, mm: number) => string },
): string {
  if (minutes < 60) return labels.minutes(minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? labels.hours(h) : labels.hoursMinutes(h, m);
}

/** Display estimate for a session of `minutes`: the unit price scales by minutes ÷ base. */
export function durationFactor(activity: ActivityTiming, minutes: number | undefined): number {
  return minutes === undefined ? 1 : minutes / baseMinutes(activity);
}

/** Only the ticked activities the guest actually extended; base-duration picks are left out of the request. */
export function durationsPayload(
  activities: Array<Pick<Activity, "slug"> & ActivityTiming>,
  selectedSlugs: string[],
  durations: Record<string, number>,
): Record<string, number> | undefined {
  const picked: Record<string, number> = {};
  for (const a of activities) {
    const minutes = durations[a.slug];
    if (selectedSlugs.includes(a.slug) && minutes !== undefined && minutes !== baseMinutes(a)) {
      picked[a.slug] = minutes;
    }
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}
