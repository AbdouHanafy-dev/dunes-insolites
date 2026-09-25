import type { Tour } from "@/lib/types";

/** The `tourDuration.format` message of any locale, from either next-intl hook. */
export type TourDurationTranslate = (
  key: "format",
  values: { hours: number; days: number; rest: number },
) => string;

type DurationSource = Pick<Tour, "duration" | "durationHours">;

/**
 * A circuit's duration is whole hours. "6 h", "1 day (24 h)", "1 day and 2 h (26 h)":
 * the wording per locale lives in messages/*.json (`tourDuration.format`).
 * Falls back to the server's own label when hours are absent (old cached payloads).
 */
export function formatTourDuration(t: TourDurationTranslate, tour: DurationSource): string {
  const hours = tour.durationHours;
  if (hours == null) return tour.duration;
  return t("format", { hours, days: Math.floor(hours / 24), rest: hours % 24 });
}

/** More than 24 h crosses a night, so the circuit needs a camp accommodation. */
export function isMultiDayTour(tour: Pick<Tour, "durationHours">): boolean {
  return tour.durationHours != null && tour.durationHours > 24;
}
