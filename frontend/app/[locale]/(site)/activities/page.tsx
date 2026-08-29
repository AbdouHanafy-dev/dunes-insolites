import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getActivities } from "@/lib/api";
import { formatDuration } from "@/lib/data/activities";
import ActivityCard from "@/components/ActivityCard";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import Steps from "@/components/Steps";
import BookDirect from "@/components/BookDirect";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

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

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [activities, t] = await Promise.all([getActivities(locale), getTranslations("activitiesPage")]);
  const difficultyLabel = {
    Easy: t("difficultyEasy"),
    Moderate: t("difficultyModerate"),
    Adventurous: t("difficultyAdventurous"),
  };

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
        image="/images/hero-combined.jpg"
      />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          <div className="cards">
            {activities.map((activity, i) => (
              <Reveal key={activity.slug} delay={i * 90}>
                <ActivityCard activity={activity} preload={i === 0} />
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ marginTop: 72 }}>
              <p className="sect-eyebrow">{t("sideBySideEyebrow")}</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                {t("whichSuits")}
              </h2>
              <div className="include-grid cols-3">
                {activities.map((a) => (
                  <div key={a.slug} className="prose" style={{ maxWidth: "none" }}>
                    <h3 style={{ marginTop: 0 }}>{a.title}</h3>
                    <ul>
                      <li>{t("perPerson", { price: a.priceFrom })}</li>
                      <li>{t("onTheSand", { duration: formatDuration(a.durationMins) })}</li>
                      <li>{difficultyLabel[a.difficulty]} · {a.groupSize}</li>
                      <li>{a.slots.length === 2 ? t("morningAndGoldenHour") : t("goldenHourOnly")}</li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <BookDirect />
      <Steps />
      <CTA />
    </>
  );
}
