import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getStays } from "@/lib/api";
import StayCard from "@/components/StayCard";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.camp" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/camp")),
  };
}

export default async function CampPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [stays, t, tCta] = await Promise.all([
    getStays(locale),
    getTranslations("campPage"),
    getTranslations("ctaCamp"),
  ]);

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
        image="/images/under-hero.jpg"
      />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          <div className="cards cols-2">
            {stays.map((stay, i) => (
              <Reveal key={stay.slug} delay={i * 90}>
                <StayCard stay={stay} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTA title={tCta("title")} body={tCta("body")} href="/contact" label={tCta("label")} />
    </>
  );
}
