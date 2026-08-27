import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActivities, getStay, getRelatedStays } from "@/lib/api";
import { getStays as seedStays } from "@/lib/data/stays";
import { canonicalStayPath } from "@/lib/legacySlugs";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import StayCard from "@/components/StayCard";
import AccommodationCard from "@/components/AccommodationCard";
import StayReservationForm from "@/components/StayReservationForm";
import Reveal from "@/components/Reveal";
import Reviews from "@/components/Reviews";
import CTA from "@/components/CTA";
import { site } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ accommodation?: string }>;
};

export function generateStaticParams() {
  return seedStays().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const stay = await getStay(slug, locale);
  if (!stay) return { title: "Not found" };

  return {
    title: stay.title,
    description: stay.tagline,
    alternates: localeAlternates(locale, (l) => canonicalStayPath(stay.slug, l)),
    openGraph: {
      title: `${stay.title} — ${site.name}`,
      description: stay.tagline,
      images: [{ url: stay.image, width: 1200, height: 630, alt: stay.title }],
    },
  };
}

export default async function StayDetail({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { accommodation: initialAccommodationSlug } = await searchParams;
  const stay = await getStay(slug, locale);
  if (!stay) notFound();

  const [related, activities, t] = await Promise.all([
    getRelatedStays(slug, locale).then((r) => r.slice(0, 2)),
    getActivities(locale),
    getTranslations("stayDetail"),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: stay.title,
    description: stay.tagline,
    image: `${site.url}${stay.image}`,
    offers: {
      "@type": "Offer",
      price: stay.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", path: localeHref(locale, "/") },
    { name: "Stay", path: localeHref(locale, "/camp") },
    { name: stay.title, path: canonicalStayPath(stay.slug, locale) },
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
            src={stay.image}
            alt={stay.title}
            fill
            sizes="100vw"
            preload
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="wrap">
          <p className="kicker">{stay.kicker}</p>
          <h1>{stay.title}</h1>
          <p className="tagline">{stay.tagline}</p>
          <div className="facts">
            <span className="fact">From €{stay.priceFrom}</span>
            <span className="fact">{t("checkIn", { time: stay.arrivalTime })}</span>
            <span className="fact">{t("checkOut", { time: stay.departureTime })}</span>
            <span className="fact">{stay.groupSize}</span>
          </div>
        </div>
      </section>

      <section className="detail-body">
        <div className="wrap">
          <div className="detail-grid">
            <div>
              <Reveal className="prose">
                <p className="sect-eyebrow">{t("experienceEyebrow")}</p>
                <h2>{t("theExperience")}</h2>
                {stay.longDescription.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </Reveal>

              {stay.accommodations && (
                <Reveal className="accommodation-section">
                  <p className="sect-eyebrow">{t("chooseHowEyebrow")}</p>
                  <h2>{t("findYourStay")}</h2>
                  <p className="accommodation-lead">{t("accommodationLead")}</p>
                  <div className="accommodation-grid">
                    {stay.accommodations.map((accommodation) => (
                      <AccommodationCard
                        key={accommodation.slug}
                        staySlug={stay.slug}
                        accommodation={accommodation}
                      />
                    ))}
                  </div>
                </Reveal>
              )}

              <Reveal className="stay-programme">
                <div className="stay-programme-heading">
                  <p className="sect-eyebrow">{t("yourEveningEyebrow")}</p>
                  <h2>{t("nightUnfolds")}</h2>
                </div>
                <div className="stay-itinerary-layout">
                  <ol className="stay-timeline">
                    {stay.itinerary.map((item) => (
                      <li key={`${item.time}-${item.title}`}>
                        <span className="stay-stop" aria-hidden="true" />
                        <p className="stay-time">{item.time}</p>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="stay-map">
                    <p className="stay-map-label">{t("yourRoute")}</p>
                    <iframe
                      title="Dunes Insolites location in Sabria"
                      src="https://www.google.com/maps?q=Sabria%2C%20Tunisia&output=embed"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a href="https://www.google.com/maps?q=Sabria%2C%20Tunisia" target="_blank" rel="noreferrer">
                      {t("openInMaps")}
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="practical-card prose" style={{ maxWidth: "none", marginTop: 56 }}>
                  <p className="practical-eyebrow">{t("knowBeforeEyebrow")}</p>
                  <h2>{t("everythingYouNeed")}</h2>
                  <div className="include-grid">
                    <div>
                      <h3 style={{ marginTop: 0 }}>{t("whatsIncluded")}</h3>
                      <ul>
                        {stay.included.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 style={{ marginTop: 0 }}>{t("notIncluded")}</h3>
                      <ul>
                        {stay.notIncluded.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <h3>{t("goodToKnow")}</h3>
                  <ul>
                    {stay.practicalInfo.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              {stay.gallery.length > 0 && (
                <Reveal>
                  <div className="detail-gallery">
                    {stay.gallery.map((src, i) => (
                      <div key={`${src}-${i}`} className="g">
                        <Image
                          src={src}
                          alt={`${stay.title} — photo ${i + 1}`}
                          fill
                          sizes="(max-width: 900px) 50vw, 33vw"
                        />
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}
            </div>

            <aside className="book-panel" id="reserve">
              <div className="price">
                <span className="v">€{stay.priceFrom}</span>
                <span className="u">{t("perPersonPerNight")}</span>
              </div>
              <div className="rows">
                <div className="row">
                  <span className="k">{t("groupSize")}</span>
                  <span className="v">{stay.groupSize}</span>
                </div>
                <div className="row">
                  <span className="k">{t("location")}</span>
                  <span className="v">{t("sabriaCamp")}</span>
                </div>
                <div className="row">
                  <span className="k">{t("stayLabel")}</span>
                  <span className="v">{t("oneNight")}</span>
                </div>
              </div>
              <StayReservationForm
                stay={stay}
                activities={activities}
                accommodations={stay.accommodations}
                initialAccommodationSlug={initialAccommodationSlug}
              />
            </aside>
          </div>

          <Reveal className="night-journal">
            <div className="night-journal-intro">
              <div>
                <p className="sect-eyebrow">{t("journalEyebrow")}</p>
                <h2>{t("journalTitle")}</h2>
              </div>
              <p>{t("journalLead")}</p>
            </div>
            <div className="night-journal-list">
              {stay.itinerary.map((item, index) => (
                <article className="night-chapter" key={`${item.time}-${item.title}`}>
                  <div className="night-chapter-top">
                    <span>0{index + 1}</span>
                    <p>{item.time}</p>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </Reveal>

          {related.length > 0 && (
            <div style={{ marginTop: 110 }}>
              <Reveal>
                <p className="sect-eyebrow">{t("alsoAtCamp")}</p>
                <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                  {t("otherStays")}
                </h2>
              </Reveal>
              <div className="cards cols-2">
                {related.map((s, i) => (
                  <Reveal key={s.slug} delay={i * 90}>
                    <StayCard stay={s} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Reviews staySlug={stay.slug} title={t("reviewsTitle", { stay: stay.title.toLowerCase() })} />

      <CTA
        title={t("ctaTitle")}
        body={t("ctaBody", { stay: stay.title })}
        href={`/camp/${stay.slug}#reserve`}
        label={t("ctaLabel", { stay: stay.title.toLowerCase() })}
      />
    </>
  );
}
