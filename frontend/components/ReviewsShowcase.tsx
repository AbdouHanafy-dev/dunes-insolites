import { getLocale, getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import Stars from "@/components/Stars";
import ReviewCard from "@/components/ReviewCard";
import ReviewsCarousel from "@/components/ReviewsCarousel";
import { getReviews, getSiteSettings } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { Link } from "@/i18n/navigation";

/**
 * The homepage's trust section: a carousel of real guest reviews, newest first,
 * each shown the way its platform shows it (see ReviewCard). With no
 * reviews yet it falls back to a plain invitation - nothing is invented.
 * Activity/stay pages keep the simpler flat `Reviews` list.
 */
export default async function ReviewsShowcase() {
  const locale = await getLocale();
  const [all, settings, t] = await Promise.all([
    getReviews(),
    getSiteSettings(),
    getTranslations("reviewsShowcase"),
  ]);

  if (!all.length) {
    const googleHref = settings.googlePlaceId
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(settings.googlePlaceId)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;

    return (
      <section className="block reviews-showcase reviews-showcase-empty" id="reviews">
        <div className="wrap reviews-empty-grid">
          <Reveal className="reviews-empty-intro">
            <p className="idx-label">{t("eyebrow")}</p>
            <h2 className="sect-title">{t("emptyTitle")}</h2>
            <p>{t("emptyBody")}</p>
            <div className="reviews-empty-actions">
              <Link href="/book" className="btn-accent">{t("bookCta")}</Link>
              <a href={googleHref} target="_blank" rel="noreferrer noopener">{t("googleCta")} ↗</a>
            </div>
          </Reveal>

          <Reveal className="reviews-empty-proof" delay={100}>
            <p>{t("proofLabel")}</p>
            <div>
              <span><strong>{settings.guestsGuided}</strong>{t("guestsLabel")}</span>
              <span><strong>{settings.yearsRunning}</strong>{t("yearsLabel")}</span>
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  // Newest first, whichever platform each one came from: a visitor wants to
  // read recent guests, not browse per-platform lists.
  const wall = [...all].sort((a, b) => b.date.localeCompare(a.date));

  // The headline figure is the business's real Google rating when we have
  // it (the number a visitor will compare against), otherwise the average
  // of the reviews shown - never a made-up value.
  const googleRating = settings.googleRating;
  const googleCount = settings.googleRatingCount;
  const avg = googleRating != null ? googleRating.toFixed(1) : averageRating(all);
  const allOnGoogleHref = settings.googlePlaceId
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(settings.googlePlaceId)}`
    : null;

  return (
    <section className="block reviews-showcase" id="reviews">
      <div className="wrap">
        <Reveal className="reviews-wall-head">
          <div>
            <p className="idx-label">{t("eyebrow")}</p>
            <h2 className="sect-title">
              {t("title")}
            </h2>
          </div>
          <div className="reviews-wall-summary">
            <div className="rating-line">
              <span className="score">{avg}</span>
              <Stars n={Math.round(Number(avg))} />
            </div>
            <span className="of">
              {googleRating != null && googleCount != null
                ? t("googleSummary", { rating: avg, count: googleCount })
                : all.length === 1
                  ? t("reviewCountOne", { count: all.length })
                  : t("reviewCountOther", { count: all.length })}
            </span>
            {allOnGoogleHref && (
              <a href={allOnGoogleHref} target="_blank" rel="noreferrer noopener" className="editorial-link">
                {t("seeAllOnGoogle")} ↗
              </a>
            )}
          </div>
        </Reveal>

        <Reveal>
          <ReviewsCarousel previousLabel={t("previous")} nextLabel={t("next")}>
            {wall.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                locale={locale}
                ownerReplyLabel={t("ownerReply")}
              />
            ))}
          </ReviewsCarousel>
        </Reveal>
      </div>
    </section>
  );
}
