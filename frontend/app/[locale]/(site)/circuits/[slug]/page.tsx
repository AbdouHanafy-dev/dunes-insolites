import type { Metadata } from "next";
import { Price } from "@/components/Price";
import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatTourDuration, tourNights } from "@/lib/tourDuration";
import { getTour, getTours, getRelatedTours, getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import TourCard from "@/components/TourCard";
import TourItinerary from "@/components/TourItinerary";
import ClampedText from "@/components/ClampedText";
import ClampedList from "@/components/ClampedList";
import Collapsible from "@/components/Collapsible";
import { tourMap } from "@/lib/tourRoute";
import TourCardCarousel from "@/components/TourCardCarousel";
import TourBookingFlow from "@/components/TourBookingFlow";
import Reviews from "@/components/Reviews";
import WishlistButton from "@/components/WishlistButton";
import ShareButton from "@/components/ShareButton";
import TourPhotoGallery from "@/components/TourPhotoGallery";
import TourMobileBookingBar from "@/components/TourMobileBookingBar";
import { site } from "@/lib/site";
import { localizedLanguageName } from "@/lib/languageFlags";
import { GUIDE_TYPE_KEYS, MEAL_TYPE_KEYS, MEAL_FORMAT_KEYS, groupSizeKey } from "@/lib/catalogLabels";

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
    twitter: {
      card: "summary_large_image",
      title: `${tour.title} — ${site.name}`,
      description: tour.description,
      images: tour.coverImage ? [tour.coverImage] : undefined,
    },
  };
}

export default async function TourDetail({ params }: Props) {
  const { locale, slug } = await params;
  const rawTour = await getTour(slug, locale);
  if (!rawTour) notFound();
  // Keep prerendering compatible while an older API deployment is still
  // serving tours created before these collection fields were introduced.
  const tour = {
    ...rawTour,
    gallery: rawTour.gallery ?? [],
    languages: rawTour.languages ?? [],
    highlights: rawTour.highlights ?? [],
    included: rawTour.included ?? [],
    notIncluded: rawTour.notIncluded ?? [],
    itinerary: rawTour.itinerary ?? [],
    meals: rawTour.meals ?? [],
    dietaryRestrictions: rawTour.dietaryRestrictions ?? [],
    transportModes: rawTour.transportModes ?? [],
    notSuitableFor: rawTour.notSuitableFor ?? [],
    notAllowed: rawTour.notAllowed ?? [],
    mustBring: rawTour.mustBring ?? [],
  };

  const [related, tourReviews, t, tLinks, tNav, tDuration, tCatalog] = await Promise.all([
    getRelatedTours(slug, locale).then((items) => items.slice(0, 3)),
    getReviews({ tourSlug: slug }),
    getTranslations("tourDetail"),
    getTranslations("contentLinks"),
    getTranslations("nav"),
    getTranslations("tourDuration"),
    getTranslations("catalogLabels"),
  ]);

  const rating = tourReviews.length
    ? averageRating(tourReviews)
    : tour.averageRating?.toFixed(1) ?? null;
  const reviewCount = tourReviews.length || tour.reviewCount || 0;
  const suppliedMedia = Array.from(
    new Set([tour.coverImage, ...tour.gallery].filter((source): source is string => !!source)),
  );

  const guideLabel = tour.guideType && tour.guideType !== "NONE"
    ? tCatalog(GUIDE_TYPE_KEYS[tour.guideType])
    : null;
  const validMeals = (tour.meals ?? [])
    .filter((m): m is { mealType: NonNullable<typeof m.mealType>; format: NonNullable<typeof m.format> } =>
      !!m.mealType && !!m.format,
    );
  const mealTotals = validMeals.reduce<Record<string, number>>((totals, meal) => {
    const key = `${meal.mealType}:${meal.format}`;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});
  const mealOccurrences: Record<string, number> = {};
  const mealLines = validMeals.map((meal) => {
    const key = `${meal.mealType}:${meal.format}`;
    mealOccurrences[key] = (mealOccurrences[key] ?? 0) + 1;
    const values = {
      meal: tCatalog(MEAL_TYPE_KEYS[meal.mealType]),
      format: tCatalog(MEAL_FORMAT_KEYS[meal.format]),
    };
    return meal.mealType === "LUNCH" && mealTotals[key] > 1
      ? tCatalog("mealLineDay", { ...values, day: mealOccurrences[key] })
      : tCatalog("mealLine", values);
  });
  const localizedGroupSize = tour.groupSize
    ? (groupSizeKey(tour.groupSize) ? tCatalog(groupSizeKey(tour.groupSize)!) : tour.groupSize)
    : null;
  const hasIncludedItems = tour.included.length > 0
    || !!guideLabel
    || mealLines.length > 0
    || !!tour.drinksIncluded
    || tour.transportModes.length > 0;
  const hasDiscount = tour.originalPriceFrom != null && tour.originalPriceFrom > tour.priceFrom;
  // The map beside the itinerary: a route through the pickup, attraction and drop-off names
  // the editor filled in on the steps (or the departure location when there are none).
  const itineraryMap = tourMap(tour.itinerary, tour.location);
  // Header blurb: the short description, or the start of the long one when no short one is saved.
  const lead = (tour.description?.trim() || tour.aboutText?.trim() || "");
  const media = suppliedMedia.length ? suppliedMedia : ["/images/camp-hero-poster.jpg"];

  // Product (not the more specific TouristTrip) per the GetYourGuide-style
  // structured-data spec this page follows. aggregateRating is only emitted
  // when `reviewCount` is real (from() above) — never fabricated, per the
  // root CLAUDE.md rule against inventing ratings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.title,
    description: tour.description,
    ...(tour.coverImage ? { image: new URL(tour.coverImage, site.url).toString() } : {}),
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

      <section className="tour-product-content">
        <div className="wrap tour-product-grid">
          <div className="tour-product-main">
            <div className="tour-hero-head">
              <nav className="tour-breadcrumb" aria-label={t("breadcrumbAria")}>
                <Link href="/">{tNav("home")}</Link>
                <span aria-hidden="true">›</span>
                <Link href="/circuits">{t("breadcrumbCircuits")}</Link>
                <span aria-hidden="true">›</span>
                <span aria-current="page">{tour.title}</span>
              </nav>
              {tour.location && <p className="tour-location">{tour.location}</p>}
              <h1>{tour.title}</h1>
              <div className="tour-header-actions">
                {rating && Number(rating) >= 4.5 && (
                  <span className="tour-rating-badge">{t("veryGoodRating")}</span>
                )}
                {rating && (
                  <a className="tour-rating" href="#reviews">
                    <strong>★ {rating}</strong>
                    <span>{reviewCount ? t("ratingReviewCount", { count: reviewCount }) : ""}</span>
                  </a>
                )}
                <span className="tour-header-desktop-action">
                  <WishlistButton slug={tour.slug} variant="inline" />
                </span>
                <span className="tour-header-desktop-action">
                  <ShareButton title={tour.title} />
                </span>
              </div>
            </div>

            <TourPhotoGallery
              media={media}
              suppliedMediaCount={suppliedMedia.length}
              title={tour.title}
              slug={tour.slug}
            />

            {lead && (
              <div className="tour-product-lead-wrap">
                <p className="tour-product-lead">{lead}</p>
                {(lead.length > 170 || (tour.aboutText && tour.aboutText !== lead)) && (
                  <a className="tour-lead-more" href="#overview">{t("seeMore")}</a>
                )}
              </div>
            )}

            <nav className="tour-subnav" aria-label={tour.title}>
              <a href="#overview">{t("theTrip")}</a>
              <a href="#how-it-works">{t("howItWorks")}</a>
              {tour.itinerary.length > 0 && <a href="#itinerary">{t("itineraryHeading")}</a>}
              {hasIncludedItems && (
                <a href="#included">{t("whatsIncluded")}</a>
              )}
              {tour.notIncluded.length > 0 && <a href="#not-included">{t("notIncluded")}</a>}
              {tour.meetingPoint && <a href="#meeting">{t("meetingPointHeading")}</a>}
            </nav>

            <div className="tour-essentials" aria-label={t("goodToKnow")}>
              <div><small>{t("duration")}</small><strong>{formatTourDuration(tDuration, tour)}</strong></div>
              {localizedGroupSize && <div><small>{t("groupSize")}</small><strong>{localizedGroupSize}</strong></div>}
              {guideLabel && (
                <div><small>{t("guideLabel")}</small><strong>{guideLabel}</strong></div>
              )}
              {tour.languages.length > 0 && (
                <div><small>{t("languagesLabel")}</small><strong>{tour.languages.map((l) => localizedLanguageName(locale, l)).join(" · ")}</strong></div>
              )}
              {tour.cancellationPolicy?.freeCancellation && (
                <div><small>{t("cancellationLabel")}</small><strong>{t("freeCancellationNote")}</strong></div>
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

            {tour.highlights.length > 0 && (
              <section className="tour-row" id="highlights">
                <h2>{t("highlights")}</h2>
                <div className="tour-row-body">
                  <ul className="tour-bullets">
                    {tour.highlights.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </section>
            )}

            <section className="tour-row" id="overview">
              <h2>{t("theTrip")}</h2>
              <div className="tour-row-body">
                <ClampedText
                  text={tour.aboutText || tour.description}
                  moreLabel={t("seeMore")}
                  lessLabel={t("seeLess")}
                />
              </div>
            </section>

            {hasIncludedItems && (
              <section className="tour-row" id="included">
                <h2>{t("whatsIncluded")}</h2>
                <div className="tour-row-body">
                  <ul className="tour-checks">
                    {guideLabel && <li data-kind="yes">{t("guideLabel")}: {guideLabel}</li>}
                    {mealLines.map((line, index) => <li key={`${line}-${index}`} data-kind="yes">{line}</li>)}
                    {tour.drinksIncluded && <li data-kind="yes">{t("drinksIncludedLabel")}</li>}
                    {tour.transportModes.map((mode) => (
                      <li key={mode} data-kind="yes">{t("transportDuringLabel")}: {mode}</li>
                    ))}
                    {tour.included.map((item) => <li key={item} data-kind="yes">{item}</li>)}
                  </ul>
                </div>
              </section>
            )}

            {tour.notIncluded.length > 0 && (
              <section className="tour-row" id="not-included">
                <h2>{t("notIncluded")}</h2>
                <div className="tour-row-body">
                  <ul className="tour-checks">
                    {tour.notIncluded.map((item) => <li key={item} data-kind="no">{item}</li>)}
                  </ul>
                </div>
              </section>
            )}

            {tour.notSuitableFor.length > 0 && (
              <section className="tour-row" id="restrictions">
                <h2>{t("notSuitableForHeading")}</h2>
                <div className="tour-row-body">
                  <ul className="tour-bullets">
                    {tour.notSuitableFor.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </section>
            )}

            <section className="tour-row" id="important">
              <h2>{t("importantInfo")}</h2>
              <div className="tour-row-body">
                {tour.mustBring.length > 0 && (
                  <>
                    <h3>{t("mustBringHeading")}</h3>
                    <ClampedList items={tour.mustBring} limit={4} moreLabel={t("seeMore")} lessLabel={t("seeLess")} />
                  </>
                )}
                {tour.notAllowed.length > 0 && (
                  <>
                    <h3>{t("notAllowedHeading")}</h3>
                    <ul className="tour-bullets">
                      {tour.notAllowed.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </>
                )}
                <h3>{t("goodToKnow")}</h3>
                {tour.goodToKnow && <p>{tour.goodToKnow}</p>}
                <ul className="tour-bullets">
                  {tour.languages.length > 0 && <li>{t("languagesSpoken", { languages: tour.languages.map((l) => localizedLanguageName(locale, l)).join(", ") })}</li>}
                  {tour.cancellationPolicy?.freeCancellation && <li>{t("freeCancellationNote")}</li>}
                  {(tour.animalsAccepted || tour.petPolicyNote) && (
                    <li>
                      {tour.animalsAccepted && t("petPolicyAccepted")}
                      {tour.animalsAccepted && tour.petPolicyNote ? " — " : ""}
                      {tour.petPolicyNote}
                    </li>
                  )}
                  {tour.emergencyPhone && <li>{t("emergencyPhoneLabel")}: {tour.emergencyPhone}</li>}
                </ul>
                {tour.ticketInfo && (
                  <>
                    <h3>{t("ticketInfoHeading")}</h3>
                    <p>{tour.ticketInfo}</p>
                  </>
                )}
                <p className="tour-row-links">
                  <Link href="/faq">{tLinks("faq")}</Link>
                  <Link href="/guides/desert-sabria-tunisie">{tLinks("planTrip")}</Link>
                </p>
              </div>
            </section>

            {tour.itinerary.length > 0 && (
              <section className="tour-row" id="itinerary">
                <h2>{t("itineraryHeading")}</h2>
                <div className="tour-row-body tour-itin-layout" data-map={itineraryMap ? "true" : undefined}>
                  <div className="tour-itin-timeline">
                    <Collapsible
                      foldable={tour.itinerary.length > 4}
                      moreLabel={t("seeMore")}
                      lessLabel={t("hideItinerary")}
                    >
                      <TourItinerary steps={tour.itinerary} />
                    </Collapsible>
                    <p className="tour-itin-note">
                      <i className="bi bi-info-circle" aria-hidden="true" />
                      <span>{t("itineraryDisclaimer")}</span>
                    </p>
                  </div>
                  {itineraryMap && (
                    <div className="tour-itin-map">
                      <iframe
                        title={tour.title}
                        src={itineraryMap.embed}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      <a href={itineraryMap.open} target="_blank" rel="noreferrer">
                        {t("openInMaps")} ↗
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {(tour.meetingPoint || tour.location) && (
              <section className="tour-row" id="meeting">
                <h2>{t("meetingPointHeading")}</h2>
                <div className="tour-row-body">
                  {tour.meetingPoint && <p>{tour.meetingPoint}</p>}
                  {tour.location && <p><strong>{tour.location}</strong></p>}
                  {tour.location && tour.itinerary.length === 0 && (
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
                </div>
              </section>
            )}

            <section className="tour-row tour-how-it-works" id="how-it-works">
              <h2>{t("howItWorks")}</h2>
              <div className="tour-row-body">
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
              </div>
            </section>
          </div>

          <aside className="tour-booking-card" id="reserve">
            <div className="tour-booking-heading">
              <small>{t("directBooking")}</small>
              <h2>{tour.title}</h2>
            </div>
            <div className="tour-booking-price">
              {hasDiscount && <span className="tour-price-original"><Price eur={tour.originalPriceFrom} /></span>}
              <span className={hasDiscount ? "tour-price-discounted" : undefined}>
                {<PriceText text={t("fromPrice", { price: priceToken(tour.priceFrom)})} />}
              </span>
              <small>{t("perAdultLabel")}</small>
            </div>
            <TourBookingFlow
              tourSlug={tour.slug}
              tourTitle={tour.title}
              adultPrice={tour.passengerAdultPrice}
              childPrice={tour.passengerChildPrice}
              infantPrice={tour.passengerInfantPrice}
              nights={tourNights(tour.durationHours)}
              departureCities={tour.departureCities}
              returnCities={tour.returnCities}
            />
            <ul className="tour-booking-promises">
              {[t("noPaymentTitle"), t("localConfirmationTitle"), t("whatsappSupportTitle")]
                .filter((text) => text && text.trim())
                .map((text) => (
                  <li key={text}>{text}</li>
                ))}
            </ul>
          </aside>
        </div>
      </section>

      <TourMobileBookingBar
        priceLabel={t("fromPrice", { price: priceToken(tour.priceFrom)})}
        unitLabel={t("perAdultLabel")}
        actionLabel={t("ctaLabel")}
        cancellationLabel={tour.cancellationPolicy?.freeCancellation ? t("freeCancellationNote") : undefined}
      />

      <Reviews tourSlug={slug} title={t("reviewsTitle", { tour: tour.title })} />

      {related.length > 0 && (
        <section className="tour-related">
          <div className="wrap">
            <p className="tour-section-kicker">{t("alsoWorthALook")}</p>
            <h2>{t("otherCircuits")}</h2>
            <TourCardCarousel previousLabel={t("previousCircuit")} nextLabel={t("nextCircuit")}>
              {related.map((item) => <TourCard key={item.slug} tour={item} />)}
            </TourCardCarousel>
          </div>
        </section>
      )}
    </main>
  );
}
