import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteImages, getTours } from "@/lib/api";
import type { Tour } from "@/lib/types";
import TourCard from "@/components/TourCard";
import CircuitsFilterBar, { type CircuitsSort } from "@/components/CircuitsFilterBar";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

/** Leading integer in a duration string ("7 Jours / 6 Nuits" -> 7). Tours
 *  without a parseable duration always sort after ones that have one,
 *  regardless of direction, rather than landing at an arbitrary spot. */
function durationDays(duration: string): number | null {
  const match = duration.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function applyFilters(tours: Tour[], q: string | undefined, sort: string | undefined): Tour[] {
  let result = tours;

  const needle = q?.trim().toLowerCase();
  if (needle) {
    result = result.filter((tour) =>
      [tour.title, tour.description, tour.location ?? ""].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  }

  if (sort) {
    const sorted = [...result];
    const byPrice = (a: Tour, b: Tour) => a.priceFrom - b.priceFrom;
    const byDuration = (a: Tour, b: Tour) => {
      const da = durationDays(a.duration);
      const db = durationDays(b.duration);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    };
    const comparators: Record<CircuitsSort, (a: Tour, b: Tour) => number> = {
      price_asc: byPrice,
      price_desc: (a, b) => byPrice(b, a),
      duration_asc: byDuration,
      duration_desc: (a, b) => byDuration(b, a),
    };
    const comparator = comparators[sort as CircuitsSort];
    if (comparator) sorted.sort(comparator);
    result = sorted;
  }

  return result;
}

/**
 * Route Insolite's multi-day circuits, published on the Dunes vitrine.
 * Reversed 18 Sep 2026 (business owner, explicit) from the "coming soon"
 * stub this page used to be — see docs/OPEN-QUESTIONS.md Q6's addendum and
 * CLAUDE.md's "multi-day touring" note for the full tradeoff. Route
 * Insolite still has no vitrine of its own (R4, unscheduled); these are
 * managed from the same admin as every other product on this platform.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.circuits" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/circuits")),
  };
}

export default async function CircuitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { locale } = await params;
  const { q, sort } = await searchParams;
  const [allTours, t, images] = await Promise.all([getTours(locale), getTranslations("circuitsPage"), getSiteImages()]);
  const tours = applyFilters(allTours, q, sort);
  const isFiltered = !!q || !!sort;

  return (
    <>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image={images["pagehead.circuits"]} />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          {allTours.length > 0 && (
            <CircuitsFilterBar resultCount={tours.length} />
          )}
          {tours.length > 0 ? (
            <div className="cards">
              {tours.map((tour, i) => (
                <Reveal key={tour.slug} delay={i * 90}>
                  <TourCard tour={tour} preload={i === 0} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <p className="lead">{isFiltered ? t("noResults") : t("noneYet")}</p>
            </Reveal>
          )}
        </div>
      </section>

      <CTA title={t("title")} body={t("lead")} href="/contact" label={t("ctaLabel")} />
    </>
  );
}
