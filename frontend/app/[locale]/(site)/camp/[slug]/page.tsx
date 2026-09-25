import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActivities, getStay, getRelatedStays, getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { getStays as seedStays } from "@/lib/data/stays";
import { canonicalStayPath } from "@/lib/legacySlugs";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import StayCard from "@/components/StayCard";
import AccommodationCard from "@/components/AccommodationCard";
import StayReservationForm from "@/components/StayReservationForm";
import Reveal from "@/components/Reveal";
import Reviews from "@/components/Reviews";
import CTA from "@/components/CTA";
import WishlistButton from "@/components/WishlistButton";
import ShareButton from "@/components/ShareButton";
import TourPhotoGallery from "@/components/TourPhotoGallery";
import AccGallery from "@/components/AccGallery";
import { sortByPrice } from "@/lib/guestPricing";
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

  const [related, activities, stayReviews, t, tLinks, tNav, tTour, tGallery] = await Promise.all([
    getRelatedStays(slug, locale).then((r) => r.slice(0, 2)),
    getActivities(locale),
    getReviews({ staySlug: slug }),
    getTranslations("stayDetail"),
    getTranslations("contentLinks"),
    getTranslations("nav"),
    getTranslations("tourDetail"),
    getTranslations("galleryGrid"),
  ]);

  // Price shown follows how the stay is sold: with accommodation types the guest
  // pays per tier (so "from" the cheapest one); without, the stay's own
  // per-person rates from the back office.
  const tierPrices = (stay.accommodations ?? []).map((a) => a.priceFrom);
  const hasTiers = tierPrices.length > 0;
  const lowestTierPrice = hasTiers ? Math.min(...tierPrices) : stay.priceFrom;
  const adultRate = stay.adultPrice ?? stay.priceFrom;
  const childRate = stay.childPrice ?? adultRate;
  const sameRate = adultRate === childRate;
  const maxNights = stay.maxNights ?? 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: stay.title,
    description: stay.tagline,
    image: `${site.url}${stay.image}`,
    offers: {
      "@type": "Offer",
      price: hasTiers ? lowestTierPrice : adultRate,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    // Same guard as activities/[slug] — only emitted when reviews exist
    // behind it, so this page's own Reviews section (below) and its
    // structured data never disagree, and no manual-action risk from an
    // unsupported rating claim.
    ...(stayReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating(stayReviews),
            reviewCount: stayReviews.length,
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: tNav("stay"), path: localeHref(locale, "/camp") },
    { name: stay.title, path: canonicalStayPath(stay.slug, locale) },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

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

      <section className="tour-product-content">
        <div className="wrap">
        <div className="tour-product-grid">
          <div className="tour-product-main">
            <div className="tour-hero-head">
              {stay.kicker && <p className="tour-location">{stay.kicker}</p>}
              <h1>{stay.title}</h1>
              <div className="tour-header-actions">
                <span className="tour-header-desktop-action">
                  <WishlistButton slug={stay.slug} kind="stay" variant="inline" />
                </span>
                <span className="tour-header-desktop-action">
                  <ShareButton title={stay.title} />
                </span>
              </div>
            </div>

            <TourPhotoGallery
              media={[stay.image, ...stay.gallery].filter((src): src is string => isDisplayableImageSrc(src))}
              suppliedMediaCount={1 + stay.gallery.length}
              title={stay.title}
              slug={stay.slug}
            />

            <p className="tour-product-lead">{stay.tagline}</p>

            {(() => {
              const essentials = [
                { label: t("groupSize"), value: stay.groupSize },
                { label: t("checkInLabel"), value: stay.arrivalTime },
                { label: t("checkOutLabel"), value: stay.departureTime },
              ].filter((item) => item.value && item.value.trim());
              if (essentials.length === 0) return null;
              return (
                <div className="tour-essentials" aria-label={t("goodToKnow")}>
                  {essentials.map((item) => (
                    <div key={item.label}><small>{item.label}</small><strong>{item.value}</strong></div>
                  ))}
                </div>
              );
            })()}

            <div>
              <Reveal className="prose">
                <p className="sect-eyebrow">{t("experienceEyebrow")}</p>
                <h2>{t("theExperience")}</h2>
                {stay.longDescription.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </Reveal>

              {stay.accommodations && stay.accommodations.length > 0 && (
                <Reveal className="accommodation-section">
                  <p className="sect-eyebrow">{t("chooseHowEyebrow")}</p>
                  <h2>{t("findYourStay")}</h2>
                  <p className="accommodation-lead">{t("accommodationLead")}</p>
                  <div className="accommodation-grid">
                    {sortByPrice(stay.accommodations).map((accommodation, i) => (
                      <AccommodationCard
                        key={accommodation.slug}
                        staySlug={stay.slug}
                        accommodation={accommodation}
                        index={i + 1}
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
                  <h3>{tLinks("planningHeading")}</h3>
                  <ul>
                    <li>
                      <Link href="/guides/que-faut-il-emporter-desert">{tLinks("packing")}</Link>
                    </li>
                    <li>
                      <Link href="/faq">{tLinks("faq")}</Link>
                    </li>
                  </ul>
                </div>
              </Reveal>

              {stay.gallery.filter(isDisplayableImageSrc).length > 0 && (
                <Reveal>
                  <div style={{ "--acc-ink": "#241b17" } as React.CSSProperties}>
                  <AccGallery
                    photos={stay.gallery.filter(isDisplayableImageSrc)}
                    title={stay.title}
                    labels={{
                      viewAll: tTour("allPhotos"),
                      close: tGallery("close"),
                      previous: tTour("photoPrevious"),
                      next: tTour("photoNext"),
                      photoOf: tTour("photoOf", { n: "{n}", total: "{total}" }),
                    }}
                  />
                  </div>
                </Reveal>
              )}
            </div>
          </div>

          <aside className="tour-booking-card" id="reserve">
            <div className="tour-booking-heading">
              <small>{t("directBooking")}</small>
              <h2>{stay.title}</h2>
            </div>
            <div className="tour-booking-price">
              <span>€{hasTiers ? lowestTierPrice : adultRate}</span>
              <small>
                {hasTiers ? t("perNight") : sameRate ? t("perPersonPerNight") : t("perAdultPerNight")}
              </small>
            </div>
            <ul className="tour-booking-promises">
              {[
                !hasTiers && !sameRate ? `€${childRate} ${t("perChildPerNight")}` : "",
                stay.groupSize,
                t("sabriaCamp"),
                maxNights > 1 ? t("upToNights", { max: maxNights }) : t("oneNight"),
              ]
                .filter((text) => text && text.trim())
                .map((text) => (
                  <li key={text}>{text}</li>
                ))}
            </ul>
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
