import type { Activity } from "@/lib/types";
import { activitiesFr } from "@/lib/data/activities-i18n/fr";
import { activitiesEn } from "@/lib/data/activities-i18n/en";
import { activitiesDe } from "@/lib/data/activities-i18n/de";
import { activitiesIt } from "@/lib/data/activities-i18n/it";
import { activitiesDa } from "@/lib/data/activities-i18n/da";
import { activitiesAr } from "@/lib/data/activities-i18n/ar";

/**
 * Seed content, one array per locale (multi-language rollout). Swap this
 * module for a CMS/DB query later — every consumer goes through the
 * helpers below, and `lib/api.ts` is the only caller (it resolves the
 * current locale via next-intl's `getLocale()` before calling these).
 *
 * All 6 arrays must stay in the same slug order and cover the same set of
 * slugs — a slug present in one locale and missing in another silently
 * breaks that locale's detail page.
 */
const byLocale: Record<string, Activity[]> = {
  fr: activitiesFr,
  en: activitiesEn,
  de: activitiesDe,
  it: activitiesIt,
  da: activitiesDa,
  ar: activitiesAr,
};

const DEFAULT_LOCALE = "fr";

export function getActivities(locale: string = DEFAULT_LOCALE): Activity[] {
  return byLocale[locale] ?? byLocale[DEFAULT_LOCALE];
}

export function getActivity(slug: string, locale: string = DEFAULT_LOCALE): Activity | undefined {
  return getActivities(locale).find((a) => a.slug === slug);
}

export function getRelated(slug: string, locale: string = DEFAULT_LOCALE): Activity[] {
  return getActivities(locale).filter((a) => a.slug !== slug);
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
