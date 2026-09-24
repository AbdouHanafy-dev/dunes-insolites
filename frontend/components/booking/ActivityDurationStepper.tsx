"use client";

import { useTranslations } from "next-intl";
import type { Activity } from "@/lib/types";
import { baseMinutes, formatSessionMinutes, maxMinutes, stepDuration } from "@/lib/activityPricing";

/**
 * − / + control for how long a timed activity lasts, shown under a ticked
 * activity. Only rendered when the back office allows extending it (max above
 * base). The price scales with the minutes; the server re-prices and validates.
 */
export default function ActivityDurationStepper({
  activity,
  minutes,
  onChange,
}: {
  activity: Pick<Activity, "title" | "baseDurationMinutes" | "durationStepMinutes" | "maxDurationMinutes">;
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const t = useTranslations("activityDuration");
  const label = formatSessionMinutes(minutes, {
    minutes: (n) => t("minutes", { n }),
    oneHour: t("oneHour"),
    hours: (h, mm) => (mm ? t("hoursMinutes", { h, mm }) : t("hours", { h })),
  });

  return (
    <div className="ride-duration">
      <span>{t("label")}</span>
      <div className="guest-stepper">
        <button
          type="button"
          onClick={() => onChange(stepDuration(activity, minutes, -1))}
          disabled={minutes <= baseMinutes(activity)}
          aria-label={t("decrease", { title: activity.title })}
        >−</button>
        <output aria-label={`${activity.title} ${label}`} className="ride-duration-value">{label}</output>
        <button
          type="button"
          onClick={() => onChange(stepDuration(activity, minutes, 1))}
          disabled={minutes >= maxMinutes(activity)}
          aria-label={t("increase", { title: activity.title })}
        >+</button>
      </div>
    </div>
  );
}

/** The "30 min / 1 Hour / 1:30H" formatter, translated, for summaries outside the stepper. */
export function useSessionLabel(): (minutes: number) => string {
  const t = useTranslations("activityDuration");
  return (minutes) =>
    formatSessionMinutes(minutes, {
      minutes: (n) => t("minutes", { n }),
      oneHour: t("oneHour"),
      hours: (h, mm) => (mm ? t("hoursMinutes", { h, mm }) : t("hours", { h })),
    });
}
