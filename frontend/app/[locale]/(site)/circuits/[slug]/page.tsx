import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTour, getTours, getRelatedTours, getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import TourCard from "@/components/TourCard";
import TourBookingForm from "@/components/TourBookingForm";
import Reveal from "@/components/Reveal";
import Reviews from "@/components/Reviews";
import CTA from "@/components/CTA";
import { site } from "@/lib/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

// No seed source for Tours (unlike activities/stays' lib/data/*-i18n) — the
// real catalog, from the real backend, is the only source of truth. Without
// a backend configured this simply renders nothing at build time; pages
// still resolve on demand at request time (dynamicParams defaults to true).
export async function generateStaticParams() {
  const tours = await getTours().catch(() => []);
  return tours.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tour = await getTour(slug, locale);
  if (!tour) return { title: "Not found" };

  return {
    title: tour.title,
    description: tour.description,
    alternates: localeAlternates(locale, (l) => localeHref(l, `/circuits/${tour.slug}`)),
    openGraph: {
      title: `${tour.title} — ${site.name}`,
      description: tour.description,
      images: tour.coverImage ? [{ url: tour.coverImage, width: 1200, height: 630, alt: tour.title }] : undefined,
    },
  };
}

export default async function TourDetail({ params }: Props) {
  const { locale, slug } = await params;
  const tour = await getTour(slug, locale);
  if (!tour) notFound();

  const [related, tourReviews, t, tLinks, tNav] = await Promise.all([
    getRelatedTours(slug, locale).then((r) => r.slice(0, 2)),
    getReviews({ tourSlug: slug }),
    getTranslations("tourDetail"),
    getTranslations("contentLinks"),
    getTranslations("nav"),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.description,
    ...(tour.coverImage ? { image: `${site.url}${tour.coverImage}` } : {}),
    offers: {
      "@type": "Offer",
      price: tour.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    // Same guard as activities/stays — only emitted when reviews exist
    // behind it, never a fabricated aggregate.
    ...(tourReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating(tourReviews),
            reviewCount: tourReviews.length,
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("breadcrumbCircuits"), path: localeHref(locale, "/circuits") },
    { name: tour.title, path: localeHref(locale, `/circuits/${tour.slug}`) },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Breadcrumbs items={breadcrumbItems} />

      <section className="detail-hero">
        <div className="bg">
          {tour.coverImage && (
            <Image src={tour.coverImage} alt={tour.title} fill sizes="100vw" preload style={{ objectFit: "cover" }} />
          )}
        </div>
        <div className="wrap">
          {tour.location && <p className="kicker">{tour.location}</p>}
          <h1>{tour.title}</h1>
          <p className="tagline">{tour.description}</p>
          <div className="facts">
            <span className="fact">{t("fromPrice", { price: tour.priceFrom })}</span>
            <span className="fact">{tour.duration}</span>
            {tour.groupSize && <span className="fact">{tour.groupSize}</span>}
            {tourReviews.length > 0 && (
              <span className="fact">
                {t("ratingFact", { rating: averageRating(tourReviews), count: tourReviews.length })}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="detail-body">
        <div className="wrap">
          <div className="detail-grid">
            <div>
              {tour.aboutText && (
                <Reveal className="prose">
                  <h2>{t("theTrip")}</h2>
                  <p>{tour.aboutText}</p>
                </Reveal>
              )}

              {tour.highlights.length > 0 && (
                <Reveal>
                  <div className="prose" style={{ maxWidth: "none" }}>
                    <h3>{t("highlights")}</h3>
                    <ul>
                      {tour.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}

              {(tour.included.length > 0 || tour.notIncluded.length > 0) && (
                <Reveal>
                  <div className="include-grid">
                    {tour.included.length > 0 && (
                      <div className="prose" style={{ maxWidth: "none" }}>
                        <h3 style={{ marginTop: 0 }}>{t("whatsIncluded")}</h3>
                        <ul>
                          {tour.included.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {tour.notIncluded.length > 0 && (
                      <div className="prose" style={{ maxWidth: "none" }}>
                        <h3 style={{ marginTop: 0 }}>{t("notIncluded")}</h3>
                        <ul>
                          {tour.notIncluded.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Reveal>
              )}

              {tour.itinerary.length > 0 && (
                <Reveal className="stay-programme">
                  <div className="stay-programme-heading">
                    <p className="sect-eyebrow">{t("itineraryEyebrow")}</p>
                    <h2>{t("itineraryHeading")}</h2>
                  </div>
                  <div className="stay-itinerary-layout">
                    <ol className="stay-timeline">
                      {tour.itinerary.map((step, i) => (
                        <li key={`${step.label ?? i}-${step.title ?? i}`}>
                          <span className="stay-stop" aria-hidden="true" />
                          {step.label && <p className="stay-time">{step.label}</p>}
                          <div>
                            {step.title && <h3>{step.title}</h3>}
                            {step.description && <p>{step.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                    {tour.location && (
                      <div className="stay-map">
                        <p className="stay-map-label">{t("route")}</p>
                        <iframe
                          title={tour.title}
                          src={`https://www.google.com/maps?q=${encodeURIComponent(tour.location)}&output=embed`}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                        <a
                          href={`https://www.google.com/maps?q=${encodeURIComponent(tour.location)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("openInMaps")}
                        </a>
                      </div>
                    )}
                  </div>
                </Reveal>
              )}

              {tour.meetingPoint && (
                <Reveal className="prose">
                  <h2>{t("meetingPointHeading")}</h2>
                  <p>{tour.meetingPoint}</p>
                </Reveal>
              )}

              {(tour.languages.length > 0 || tour.cancellationPolicy) && (
                <Reveal>
                  <div className="prose" style={{ maxWidth: "none" }}>
                    <h3>{t("goodToKnow")}</h3>
                    <ul>
                      {tour.languages.length > 0 && <li>{t("languagesSpoken", { languages: tour.languages.join(", ") })}</li>}
                      {tour.cancellationPolicy?.freeCancellation && <li>{t("freeCancellationNote")}</li>}
                    </ul>
                    <h3>{tLinks("planningHeading")}</h3>
                    <ul>
                      <li>
                        <Link href="/faq">{tLinks("faq")}</Link>
                      </li>
                      <li>
                        <Link href="/contact">{tLinks("planTrip")}</Link>
                      </li>
                    </ul>
                  </div>
                </Reveal>
              )}

              {tour.gallery.length > 0 && (
                <Reveal>
                  <div className="detail-gallery">
                    {tour.gallery.map((src, i) => (
                      <div key={`${src}-${i}`} className="g">
                        <Image src={src} alt={`${tour.title} — photo ${i + 1}`} fill sizes="(max-width: 900px) 50vw, 33vw" />
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}
            </div>

            <aside className="book-panel" id="reserve">
              <div className="price">
                <span className="v">€{tour.priceFrom}</span>
                <span className="u">{t("perAdultLabel")}</span>
              </div>
              <div className="rows">
                <div className="row">
                  <span className="k">{t("duration")}</span>
                  <span className="v">{tour.duration}</span>
                </div>
                {tour.groupSize && (
                  <div className="row">
                    <span className="k">{t("groupSize")}</span>
                    <span className="v">{tour.groupSize}</span>
                  </div>
                )}
                {tour.location && (
                  <div className="row">
                    <span className="k">{t("location")}</span>
                    <span className="v">{tour.location}</span>
                  </div>
                )}
              </div>
              <TourBookingForm tourSlug={tour.slug} priceFrom={tour.priceFrom} />
            </aside>
          </div>

          {related.length > 0 && (
            <div style={{ marginTop: 110 }}>
              <Reveal>
                <p className="sect-eyebrow">{t("alsoWorthALook")}</p>
                <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                  {t("otherCircuits")}
                </h2>
              </Reveal>
              <div className="cards cols-2">
                {related.map((tr, i) => (
                  <Reveal key={tr.slug} delay={i * 90}>
                    <TourCard tour={tr} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Reviews tourSlug={slug} title={t("reviewsTitle", { tour: tour.title })} />

      <CTA
        title={t("ctaTitle")}
        body={t("ctaBody", { tour: tour.title })}
        href={`/circuits/${tour.slug}#reserve`}
        label={t("ctaLabel")}
      />
    </>
  );
}
