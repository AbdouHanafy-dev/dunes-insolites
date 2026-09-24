import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getActivities, getSiteImages } from "@/lib/api";
import type { Activity } from "@/lib/types";
import ActivityCard from "@/components/ActivityCard";
import CircuitsFilterBar, { type CircuitsSort } from "@/components/CircuitsFilterBar";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

function applyFilters(items: Activity[], q: string | undefined, sort: string | undefined): Activity[] {
  let result = items;

  const needle = q?.trim().toLowerCase();
  if (needle) {
    result = result.filter((a) =>
      [a.title, a.description, a.kicker ?? ""].some((field) => field.toLowerCase().includes(needle)),
    );
  }

  if (sort) {
    const comparators: Record<CircuitsSort, (a: Activity, b: Activity) => number> = {
      price_asc: (a, b) => a.priceFrom - b.priceFrom,
      price_desc: (a, b) => b.priceFrom - a.priceFrom,
      duration_asc: (a, b) => a.durationMins - b.durationMins,
      duration_desc: (a, b) => b.durationMins - a.durationMins,
    };
    const comparator = comparators[sort as CircuitsSort];
    if (comparator) result = [...result].sort(comparator);
  }

  return result;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.activities" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/activities")),
  };
}

/**
 * Same page structure as /circuits: header, search + sort bar, a grid of
 * `edit-card` cards, and a closing contact banner.
 */
export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { locale } = await params;
  const { q, sort } = await searchParams;
  const [allActivities, t, images] = await Promise.all([
    getActivities(locale),
    getTranslations("activitiesPage"),
    getSiteImages(),
  ]);
  const activities = applyFilters(allActivities, q, sort);
  const isFiltered = !!q || !!sort;

  return (
    <>
      <PageHead
        eyebrow={t("eyebrow")}
        title={
          <>
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </>
        }
        lead={t("lead")}
        image={images["pagehead.activities"]}
      />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          {allActivities.length > 0 && (
            <CircuitsFilterBar resultCount={activities.length} namespace="activitiesPage" />
          )}
          {activities.length > 0 ? (
            <div className="cards">
              {activities.map((activity, i) => (
                <Reveal key={activity.slug} delay={i * 90}>
                  <ActivityCard activity={activity} preload={i === 0} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <p className="lead">{isFiltered ? t("noResults") : ""}</p>
            </Reveal>
          )}
        </div>
      </section>

      <CTA title={t("ctaTitle")} body={t("ctaBody")} href="/contact" label={t("ctaLabel")} />
    </>
  );
}
