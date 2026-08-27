import type { Stay } from "@/lib/types";
import { staysFr } from "@/lib/data/stays-i18n/fr";
import { staysEn } from "@/lib/data/stays-i18n/en";
import { staysDe } from "@/lib/data/stays-i18n/de";
import { staysIt } from "@/lib/data/stays-i18n/it";
import { staysDa } from "@/lib/data/stays-i18n/da";
import { staysAr } from "@/lib/data/stays-i18n/ar";

/**
 * Seed content, one array per locale (multi-language rollout). Swap this
 * module for a CMS/DB query later — every consumer goes through the
 * helpers below, and `lib/api.ts` is the only caller (it resolves the
 * current locale via next-intl's `getLocale()` before calling these).
 *
 * Two nuitées — that's the whole overnight product. Everything Dunes
 * Insolites runs happens on-site in Sabria: the fixed camp, or a simpler
 * bivouac further into the dunes.
 *
 * All 6 arrays must stay in the same slug order and cover the same set of
 * slugs — a slug present in one locale and missing in another silently
 * breaks that locale's detail page.
 */
const byLocale: Record<string, Stay[]> = {
  fr: staysFr,
  en: staysEn,
  de: staysDe,
  it: staysIt,
  da: staysDa,
  ar: staysAr,
};

const DEFAULT_LOCALE = "fr";

export function getStays(locale: string = DEFAULT_LOCALE): Stay[] {
  return byLocale[locale] ?? byLocale[DEFAULT_LOCALE];
}

export function getStay(slug: string, locale: string = DEFAULT_LOCALE): Stay | undefined {
  return getStays(locale).find((s) => s.slug === slug);
}

export function getRelatedStays(slug: string, locale: string = DEFAULT_LOCALE): Stay[] {
  return getStays(locale).filter((s) => s.slug !== slug);
}
