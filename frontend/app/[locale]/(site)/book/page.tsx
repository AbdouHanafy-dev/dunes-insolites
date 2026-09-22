import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import BookingFlow from "@/components/BookingFlow";
import { getActivities } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.book" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/book")),
    robots: { index: false },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [activities, t] = await Promise.all([getActivities(locale), getTranslations("bookPage")]);

  return (
    <section className="book-page">
      <div className="wrap">
        <p className="sect-eyebrow">{t("eyebrow")}</p>
        <h1 className="sect-title" style={{ fontSize: "clamp(34px,4.4vw,64px)", marginBottom: 44 }}>
          {t("title")}
        </h1>
        {/* Same card TourBookingFlow renders inside on a circuit's own page
            (`.tour-booking-card` in tour-product-grid) - here it's a
            standalone, centered card since /book has no adjoining trip
            content column to scroll it alongside. */}
        <div
          className="tour-booking-card"
          style={{ position: "static", maxWidth: 1120, width: "100%", maxHeight: "none", overflow: "visible", margin: "0 auto" }}
        >
          <Suspense fallback={<div>{t("loading")}</div>}>
            <BookingFlow activities={activities} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
