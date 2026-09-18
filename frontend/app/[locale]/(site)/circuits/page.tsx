import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getTours } from "@/lib/api";
import TourCard from "@/components/TourCard";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [tours, t] = await Promise.all([getTours(locale), getTranslations("circuitsPage")]);

  return (
    <>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/quad.jpg" />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
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
              <p className="lead">{t("noneYet")}</p>
            </Reveal>
          )}
        </div>
      </section>

      <CTA title={t("title")} body={t("lead")} href="/contact" label={t("ctaLabel")} />
    </>
  );
}
