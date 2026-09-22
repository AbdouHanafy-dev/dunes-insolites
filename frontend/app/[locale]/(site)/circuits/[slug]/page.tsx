import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTour, getTours, getRelatedTours, getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import TourCard from "@/components/TourCard";
import TourCardCarousel from "@/components/TourCardCarousel";
import TourBookingFlow from "@/components/TourBookingFlow";
import Reviews from "@/components/Reviews";
import { site } from "@/lib/site";
import { GUIDE_TYPE_LABELS, MEAL_TYPE_LABELS, MEAL_FORMAT_LABELS } from "@/lib/types";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const tours = await getTours().catch(() => []);
  return tours.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tour = await getTour(slug, locale);
  if (!tour) return { title: "Not found" };

  return {
    title: tour.title,
    description: tour.description,
    alternates: localeAlternates(locale, (language) =>
      localeHref(language, `/circuits/${tour.slug}`),
    ),
    openGraph: {
      title: `${tour.title} — ${site.name}`,
      description: tour.description,
      images: tour.coverImage
        ? [{ url: tour.coverImage, width: 1200, height: 630, alt: tour.title }]
        : undefined,
    },
  };
}

export default async function TourDetail({ params }: Props) {
  const { locale, slug } = await params;
  const tour = await getTour(slug, locale);
  if (!tour) notFound();

  const [related, tourReviews, t, tLinks, tNav] = await Promise.all([
    getRelatedTours(slug, locale).then((items) => items.slice(0, 3)),
    getReviews({ tourSlug: slug }),
    getTranslations("tourDetail"),
    getTranslations("contentLinks"),
    getTranslations("nav"),
  ]);

  const rating = tourReviews.length
    ? averageRating(tourReviews)
    : tour.averageRating?.toFixed(1) ?? null;
  const reviewCount = tourReviews.length || tour.reviewCount || 0;
  const suppliedMedia = Array.from(
    new Set([tour.coverImage, ...tour.gallery].filter((source): source is string => !!source)),
  );

  const guideLabel = tour.guideType && tour.guideType !== "NONE" ? GUIDE_TYPE_LABELS[tour.guideType] : null;
  const mealLines = (tour.meals ?? [])
    .filter((m): m is { mealType: NonNullable<typeof m.mealType>; format: NonNullable<typeof m.format> } =>
      !!m.mealType && !!m.format,
    )
    .map((m) => `${MEAL_TYPE_LABELS[m.mealType]} (${MEAL_FORMAT_LABELS[m.format]})`);
  const hasDiscount = tour.originalPriceFrom != null && tour.originalPriceFrom > tour.priceFrom;
  const hasRestrictions = tour.notSuitableFor.length > 0 || tour.notAllowed.length > 0 || !!tour.petPolicyNote;
  const hasPracticalInfo =
    !!tour.goodToKnow || tour.mustBring.length > 0 || !!tour.emergencyPhone || !!tour.ticketInfo;
  const media = suppliedMedia.length ? suppliedMedia.slice(0, 5) : ["/images/camp-hero-poster.jpg"];

  // Product (not the more specific TouristTrip) per the GetYourGuide-style
  // structured-data spec this page follows. aggregateRating is only emitted
  // when `reviewCount` is real (from() above) — never fabricated, per the
  // root CLAUDE.md rule against inventing ratings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.title,
    description: tour.description,
    ...(tour.coverImage ? { image: `${site.url}${tour.coverImage}` } : {}),
    offers: {
      "@type": "Offer",
      price: tour.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    ...(reviewCount > 0 && rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount,
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("breadcrumbCircuits"), path: localeHref(locale, "/circuits") },
    { name: tour.title, path: localeHref(locale, `/circuits/${tour.slug}`) },
  ];

  return (
    <main className="tour-product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)) }}
      />

      <div className="tour-product-head wrap">
        <div className="tour-product-title">
          <div>
            {tour.location && <p className="tour-location">{tour.location}</p>}
            <h1>{tour.title}</h1>
          </div>
          {rating && (
            <a className="tour-rating" href="#reviews">
              <strong>★ {rating}</strong>
              <span>{reviewCount ? `(${reviewCount})` : ""}</span>
            </a>
          )}
        </div>
        <p className="tour-product-lead">{tour.description}</p>
      </div>

      <section className={`tour-media wrap media-count-${media.length}`} aria-label={tour.title}>
        <div className="tour-media-primary">
          <Image src={media[0]} alt={suppliedMedia.length ? tour.title : ""} fill sizes="(max-width: 800px) 100vw, 68vw" priority />
        </div>
        {media.length > 1 && (
          <div className="tour-media-secondary">
            {media.slice(1).map((source, index) => (
              <div className="tour-media-cell" key={`${source}-${index}`}>
                <Image src={source} alt={`${tour.title} — ${index + 2}`} fill sizes="(max-width: 800px) 50vw, 22vw" />
              </div>
            ))}
          </div>
        )}
      </section>

      <nav className="tour-subnav" aria-label={tour.title}>
        <div className="wrap">
          <div>
            <a href="#overview">{t("theTrip")}</a>
            <a href="#how-it-works">{t("howItWorks")}</a>
            {tour.itinerary.length > 0 && <a href="#itinerary">{t("itineraryHeading")}</a>}
            {(tour.included.length > 0 || tour.notIncluded.length > 0) && (
              <a href="#included">{t("whatsIncluded")}</a>
            )}
            {tour.meetingPoint && <a href="#meeting">{t("meetingPointHeading")}</a>}
          </div>
          <a className="tour-subnav-book" href="#reserve">
            {t("fromPrice", { price: tour.priceFrom })} · {t("ctaLabel")}
          </a>
        </div>
      </nav>

      <section className="tour-product-content">
        <div className="wrap tour-product-grid">
          <div className="tour-product-main">
            <div className="tour-essentials" aria-label={t("goodToKnow")}>
              <div><small>{t("duration")}</small><strong>{tour.duration}</strong></div>
              {tour.groupSize && <div><small>{t("groupSize")}</small><strong>{tour.groupSize}</strong></div>}
              {guideLabel && (
                <div><small>{t("guideLabel")}</small><strong>{guideLabel}</strong></div>
              )}
              {tour.languages.length > 0 && (
                <div><small>{t("goodToKnow")}</small><strong>{tour.languages.join(" · ")}</strong></div>
              )}
              {tour.cancellationPolicy?.freeCancellation && (
                <div><small>{t("goodToKnow")}</small><strong>{t("freeCancellationNote")}</strong></div>
              )}
            </div>

            <section className="tour-booking-benefits" aria-labelledby="booking-benefits-title">
              <h2 id="booking-benefits-title">{t("bookingBenefitsHeading")}</h2>
              <div>
                <article>
                  <span aria-hidden="true">01</span>
                  <h3>{t("noPaymentTitle")}</h3>
                  <p>{t("noPaymentBody")}</p>
                </article>
                <article>
                  <span aria-hidden="true">02</span>
                  <h3>{t("localConfirmationTitle")}</h3>
                  <p>{t("localConfirmationBody")}</p>
                </article>
                <article>
                  <span aria-hidden="true">03</span>
                  <h3>{t("whatsappSupportTitle")}</h3>
                  <p>{t("whatsappSupportBody")}</p>
                </article>
              </div>
            </section>

            <section className="tour-section tour-overview" id="overview">
              <h2>{t("theTrip")}</h2>
              <p>{tour.aboutText || tour.description}</p>
            </section>

            {tour.highlights.length > 0 && (
              <section className="tour-section tour-highlights">
                <h2>{t("highlights")}</h2>
                <ul>
                  {tour.highlights.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            )}

            {tour.itinerary.length > 0 && (
              <section className="tour-section tour-itinerary" id="itinerary">
                <p className="tour-section-kicker">{t("itineraryEyebrow")}</p>
                <h2>{t("itineraryHeading")}</h2>
                <ol>
                  {tour.itinerary.map((step, index) => (
                    <li key={`${step.label ?? index}-${step.title ?? index}`}>
                      <span className="tour-itinerary-number">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        {step.label && <small>{step.label}</small>}
                        {step.title && (
                          <h3>
                            {step.title}
                            {step.segmentType === "TRANSFER" && (
                              <span className="tour-itinerary-badge">{t("transferBadge")}</span>
                            )}
                            {step.optionalSegment && (
                              <span className="tour-itinerary-badge">{t("optionalSegmentBadge")}</span>
                            )}
                          </h3>
                        )}
                        {step.description && <p>{step.description}</p>}
                        {step.durationMinutes != null && (
                          <p className="tour-itinerary-duration">{step.durationMinutes} min</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {(tour.included.length > 0 || tour.notIncluded.length > 0 || guideLabel || mealLines.length > 0 || tour.transportModes.length > 0) && (
              <section className="tour-section" id="included">
                <h2>{t("whatsIncluded")}</h2>
                <div className="tour-inclusions">
                  {(tour.included.length > 0 || guideLabel || mealLines.length > 0 || tour.transportModes.length > 0) && (
                    <div>
                      <h3>{t("whatsIncluded")}</h3>
                      <ul>
                        {guideLabel && <li data-kind="yes">{t("guideLabel")}: {guideLabel}</li>}
                        {mealLines.map((line) => <li key={line} data-kind="yes">{line}</li>)}
                        {tour.drinksIncluded && <li data-kind="yes">{t("drinksIncludedLabel")}</li>}
                        {tour.transportModes.map((mode) => (
                          <li key={mode} data-kind="yes">{t("transportDuringLabel")}: {mode}</li>
                        ))}
                        {tour.included.map((item) => <li key={item} data-kind="yes">{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {tour.notIncluded.length > 0 && (
                    <div>
                      <h3>{t("notIncluded")}</h3>
                      <ul>{tour.notIncluded.map((item) => <li key={item} data-kind="no">{item}</li>)}</ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {hasRestrictions && (
              <section className="tour-section" id="restrictions">
                <h2>{t("restrictionsHeading")}</h2>
                <div className="tour-inclusions">
                  {tour.notSuitableFor.length > 0 && (
                    <div>
                      <h3>{t("notSuitableForHeading")}</h3>
                      <ul>{tour.notSuitableFor.map((item) => <li key={item} data-kind="no">{item}</li>)}</ul>
                    </div>
                  )}
                  {tour.notAllowed.length > 0 && (
                    <div>
                      <h3>{t("notAllowedHeading")}</h3>
                      <ul>{tour.notAllowed.map((item) => <li key={item} data-kind="no">{item}</li>)}</ul>
                    </div>
                  )}
                </div>
                {(tour.animalsAccepted || tour.petPolicyNote) && (
                  <p>
                    {tour.animalsAccepted && t("petPolicyAccepted")}
                    {tour.animalsAccepted && tour.petPolicyNote ? " — " : ""}
                    {tour.petPolicyNote}
                  </p>
                )}
              </section>
            )}

            {(tour.meetingPoint || tour.location) && (
              <section className="tour-section tour-meeting" id="meeting">
                <div>
                  <h2>{t("meetingPointHeading")}</h2>
                  {tour.meetingPoint && <p>{tour.meetingPoint}</p>}
                  {tour.location && <strong>{tour.location}</strong>}
                </div>
                {tour.location && (
                  <div className="tour-map">
                    <iframe
                      title={tour.title}
                      src={`https://www.google.com/maps?q=${encodeURIComponent(tour.location)}&output=embed`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a href={`https://www.google.com/maps?q=${encodeURIComponent(tour.location)}`} target="_blank" rel="noreferrer">
                      {t("openInMaps")} ↗
                    </a>
                  </div>
                )}
              </section>
            )}

            <section className="tour-section tour-how-it-works" id="how-it-works">
              <p className="tour-section-kicker">{t("directBooking")}</p>
              <h2>{t("howItWorks")}</h2>
              <ol>
                <li>
                  <span>1</span>
                  <div><h3>{t("stepChooseTitle")}</h3><p>{t("stepChooseBody")}</p></div>
                </li>
                <li>
                  <span>2</span>
                  <div><h3>{t("stepConfirmTitle")}</h3><p>{t("stepConfirmBody")}</p></div>
                </li>
                <li>
                  <span>3</span>
                  <div><h3>{t("stepPrepareTitle")}</h3><p>{t("stepPrepareBody")}</p></div>
                </li>
              </ol>
            </section>

            <section className="tour-section tour-planning">
              <h2>{t("goodToKnow")}</h2>
              {tour.goodToKnow && <p>{tour.goodToKnow}</p>}
              <ul>
                {tour.languages.length > 0 && <li>{t("languagesSpoken", { languages: tour.languages.join(", ") })}</li>}
                {tour.cancellationPolicy?.freeCancellation && <li>{t("freeCancellationNote")}</li>}
                {tour.emergencyPhone && <li>{t("emergencyPhoneLabel")}: {tour.emergencyPhone}</li>}
              </ul>
              <p>
                <Link href="/faq">{tLinks("faq")}</Link>
                <Link href="/contact">{tLinks("planTrip")}</Link>
              </p>
            </section>

            {hasPracticalInfo && (tour.mustBring.length > 0 || tour.ticketInfo) && (
              <section className="tour-section">
                {tour.mustBring.length > 0 && (
                  <>
                    <h2>{t("mustBringHeading")}</h2>
                    <ul>{tour.mustBring.map((item) => <li key={item}>{item}</li>)}</ul>
                  </>
                )}
                {tour.ticketInfo && (
                  <>
                    <h3>{t("ticketInfoHeading")}</h3>
                    <p>{tour.ticketInfo}</p>
                  </>
                )}
              </section>
            )}
          </div>

          <aside className="tour-booking-card" id="reserve">
            <div className="tour-booking-heading">
              <small>{t("directBooking")}</small>
              <h2>{tour.title}</h2>
            </div>
            <div className="tour-booking-price">
              {hasDiscount && <span className="tour-price-original">{tour.originalPriceFrom} €</span>}
              <span className={hasDiscount ? "tour-price-discounted" : undefined}>
                {t("fromPrice", { price: tour.priceFrom })}
              </span>
              <small>{t("perAdultLabel")}</small>
            </div>
            <ul className="tour-booking-promises">
              <li>{t("noPaymentTitle")}</li>
              <li>{t("localConfirmationTitle")}</li>
              <li>{t("whatsappSupportTitle")}</li>
            </ul>
            <TourBookingFlow
              tourSlug={tour.slug}
              tourTitle={tour.title}
              adultPrice={tour.passengerAdultPrice}
              childPrice={tour.passengerChildPrice}
            />
          </aside>
        </div>
      </section>

      <Reviews tourSlug={slug} title={t("reviewsTitle", { tour: tour.title })} />

      {related.length > 0 && (
        <section className="tour-related">
          <div className="wrap">
            <p className="tour-section-kicker">{t("alsoWorthALook")}</p>
            <h2>{t("otherCircuits")}</h2>
            <TourCardCarousel>
              {related.map((item) => <TourCard key={item.slug} tour={item} />)}
            </TourCardCarousel>
          </div>
        </section>
      )}
    </main>
  );
}
