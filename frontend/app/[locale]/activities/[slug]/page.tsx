import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActivity, getRelatedActivities, getReviews } from "@/lib/api";
import { formatDuration, getActivities as seedActivities } from "@/lib/data/activities";
import { averageRating } from "@/lib/data/reviews";
import { canonicalActivityPath } from "@/lib/legacySlugs";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import ActivityCard from "@/components/ActivityCard";
import Reveal from "@/components/Reveal";
import Reviews from "@/components/Reviews";
import CTA from "@/components/CTA";
import { site } from "@/lib/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return seedActivities().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const activity = await getActivity(slug, locale);
  if (!activity) return { title: "Not found" };

  return {
    title: activity.title,
    description: activity.tagline,
    alternates: localeAlternates(locale, (l) => canonicalActivityPath(activity.slug, l)),
    openGraph: {
      title: `${activity.title} — ${site.name}`,
      description: activity.tagline,
      images: [{ url: activity.heroImage, width: 1200, height: 630, alt: activity.title }],
    },
  };
}

export default async function ActivityDetail({ params }: Props) {
  const { locale, slug } = await params;
  const activity = await getActivity(slug, locale);
  if (!activity) notFound();

  const [related, activityReviews, t, tDifficulty] = await Promise.all([
    getRelatedActivities(slug, locale),
    getReviews({ activitySlug: slug }),
    getTranslations("activityDetail"),
    getTranslations("activitiesPage"),
  ]);
  const difficultyLabel = {
    Easy: tDifficulty("difficultyEasy"),
    Moderate: tDifficulty("difficultyModerate"),
    Adventurous: tDifficulty("difficultyAdventurous"),
  }[activity.difficulty];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: activity.title,
    description: activity.tagline,
    image: `${site.url}${activity.heroImage}`,
    offers: {
      "@type": "Offer",
      price: activity.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    // Rich-result star ratings in Google. Only emitted when reviews exist —
    // aggregateRating with no reviews behind it is a manual-action risk.
    ...(activityReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating(activityReviews),
            reviewCount: activityReviews.length,
          },
        }
      : {}),
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", path: localeHref(locale, "/") },
    { name: "Experiences", path: localeHref(locale, "/activities") },
    { name: activity.title, path: canonicalActivityPath(activity.slug, locale) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="detail-hero">
        <div className="bg">
          <Image
            src={activity.heroImage}
            alt={activity.title}
            fill
            sizes="100vw"
            preload
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="wrap">
          <p className="kicker">{activity.kicker}</p>
          <h1>{activity.title}</h1>
          <p className="tagline">{activity.tagline}</p>
          <div className="facts">
            <span className="fact">From €{activity.priceFrom}</span>
            <span className="fact">{formatDuration(activity.durationMins)}</span>
            <span className="fact">{difficultyLabel}</span>
            <span className="fact">{activity.groupSize}</span>
          </div>
        </div>
      </section>

      <section className="detail-body">
        <div className="wrap">
          <div className="detail-grid">
            <div>
              <Reveal className="prose">
                <h2>{t("theTrip")}</h2>
                {activity.longDescription.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </Reveal>

              <Reveal>
                <div className="include-grid">
                  <div className="prose" style={{ maxWidth: "none" }}>
                    <h3 style={{ marginTop: 0 }}>{t("whatsIncluded")}</h3>
                    <ul>
                      {activity.included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="prose" style={{ maxWidth: "none" }}>
                    <h3 style={{ marginTop: 0 }}>{t("notIncluded")}</h3>
                    <ul>
                      {activity.notIncluded.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>

              <Reveal className="prose">
                <h2>{t("meetingPointHeading")}</h2>
                <p>{activity.meetingPoint}</p>
                <p>{t("freePickup")}</p>
              </Reveal>

              <Reveal>
                <div className="detail-gallery">
                  {activity.gallery.map((src, i) => (
                    <div key={`${src}-${i}`} className="g">
                      <Image
                        src={src}
                        alt={`${activity.title} — photo ${i + 1}`}
                        fill
                        sizes="(max-width: 900px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            <aside className="book-panel">
              <div className="price">
                <span className="v">€{activity.priceFrom}</span>
                <span className="u">{t("perPersonLabel")}</span>
              </div>
              <div className="rows">
                <div className="row">
                  <span className="k">{t("duration")}</span>
                  <span className="v">{formatDuration(activity.durationMins)}</span>
                </div>
                <div className="row">
                  <span className="k">{t("difficulty")}</span>
                  <span className="v">{difficultyLabel}</span>
                </div>
                <div className="row">
                  <span className="k">{t("groupSize")}</span>
                  <span className="v">{activity.groupSize}</span>
                </div>
                <div className="row">
                  <span className="k">{t("departures")}</span>
                  <span className="v">{t("morningGoldenHour")}</span>
                </div>
              </div>
              <Link href={`/book?activity=${activity.slug}`} className="btn-accent">
                {t("bookThisTrip")}
              </Link>
              <p className="note">{t("freeCancellation")}</p>
            </aside>
          </div>

          <div style={{ marginTop: 110 }}>
            <Reveal>
              <p className="sect-eyebrow">{t("alsoOnTheSand")}</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                {t("makeItAFullDay")}
              </h2>
            </Reveal>
            <div className="cards cols-2">
              {related.map((a, i) => (
                <Reveal key={a.slug} delay={i * 90}>
                  <ActivityCard activity={a} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Reviews activitySlug={slug} title={t("reviewsTitle", { activity: activity.title.toLowerCase() })} />

      <CTA
        title={t("ctaTitle")}
        body={t("ctaBody", { activity: activity.title })}
        href={`/book?activity=${activity.slug}`}
        label={t("ctaLabel", { activity: activity.title })}
      />
    </>
  );
}
