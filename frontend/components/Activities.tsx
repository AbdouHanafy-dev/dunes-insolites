import Image from "next/image";
import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { Link } from "@/i18n/navigation";
import { getActivities } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDuration } from "@/lib/data/activities";
import Reveal from "@/components/Reveal";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { getSiteImages } from "@/lib/api";
import { activityCardFallback } from "@/lib/siteImages";

/**
 * Redesigned (visual identity pass, 14 Sep 2026 — see
 * docs/reports/visual-design-audit-2026-09-14.md, §7) as a field-guide row
 * list instead of the hover-zoom card grid it used to share with
 * Stays.tsx — no dark scrim, no zoom-on-hover; the hover feedback is a
 * small image shift, an underline, and the index turning to the accent
 * color. Duration/difficulty/group-size come straight from the same
 * `Activity` the old cards already carried, just surfaced rather than
 * hidden behind a caption.
 *
 * Copy runs through next-intl: `activitiesSection` (new, all 6 locales)
 * for this section's own eyebrow/lead, and the existing `activitiesPage`
 * namespace for `titleLine1`/`titleLine2` (verbatim identical to what the
 * /activities listing page already shows — reused rather than duplicated)
 * and the difficulty labels (previously shown only as the raw English
 * enum value "Easy"/"Moderate"/"Adventurous").
 */
export default async function Activities() {
  const [activities, t, tPage, images] = await Promise.all([
    getActivities(await getLocale()),
    getTranslations("activitiesSection"),
    getTranslations("activitiesPage"),
    getSiteImages(),
  ]);
  const difficultyLabel: Record<string, string> = {
    Easy: tPage("difficultyEasy"),
    Moderate: tPage("difficultyModerate"),
    Adventurous: tPage("difficultyAdventurous"),
  };

  return (
    <section className="block activities" id="activities">
      <div className="wrap">
        <Reveal className="head">
          <p className="idx-label">
            {t("eyebrow")} — 01–{String(activities.length).padStart(2, "0")}
          </p>
          <h2 className="sect-title">
            {tPage("titleLine1")}
            <br />
            {tPage("titleLine2")}
          </h2>
          <p>{t("lead")}</p>
        </Reveal>

        <div className="field-list">
          {activities.map((activity, i) => (
            <Reveal key={activity.slug} delay={i * 80}>
              <Link href={`/activities/${activity.slug}`} className="field-row">
                <span className="idx-label field-row-idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="field-row-media">
                  {(
                    <Image
                      src={isDisplayableImageSrc(activity.cardImage) ? activity.cardImage : activityCardFallback(images, activity.slug)}
                      alt={activity.tagline}
                      fill
                      sizes="(max-width: 900px) 100vw, 320px"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                </span>
                <span className="field-row-body">
                  <span className="field-row-title">{activity.title}</span>
                  <span className="field-row-tagline">{activity.description}</span>
                  <span className="field-row-meta">
                    {activity.durationMins > 0 && (
                      <>
                        <span>{formatDuration(activity.durationMins)}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{difficultyLabel[activity.difficulty] ?? activity.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activity.groupSize}</span>
                  </span>
                </span>
                <span className="field-row-price">
                  {activity.priceFrom > 0 ? <PriceText text={t("fromPrice", { price: priceToken(activity.priceFrom)})} /> : t("included")}
                </span>
                <span className="field-row-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
