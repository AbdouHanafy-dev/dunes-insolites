import Stars from "@/components/Stars";
import ReviewFold from "@/components/ReviewFold";
import type { Review } from "@/lib/types";
import { useTranslations } from "next-intl";

const PLATFORM_NAMES: Partial<Record<Review["source"], string>> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  wetravel: "WeTravel",
  tripadvisor: "TripAdvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
};

/** Warm, on-palette avatar fills — one is picked from the author's name so
 *  the same person always gets the same colour. */
const AVATAR_COLORS = ["#a04a2f", "#3a6a66", "#747254", "#256599", "#8f3f27", "#5b4636"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Longer than this and the review is clamped behind "Read more". */
const FOLD_BODY_CHARS = 280;
const FOLD_REPLY_CHARS = 170;

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatMonth(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/**
 * One real guest review, in the guest's own words — never translated or
 * shortened. Laid out like the platform it came from (avatar, name, rating,
 * trip type, text, then the owner's public reply) so a visitor recognises
 * it as the same review they would see there. The platform's own colour
 * (--platform) accents the card's top edge and its pill.
 */
export default function ReviewCard({
  review,
  locale,
  ownerReplyLabel,
  moreLabel,
  lessLabel,
}: {
  review: Review;
  locale: string;
  ownerReplyLabel: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const t = useTranslations("reviewsShowcase");
  const platformName = review.platformName
    ?? PLATFORM_NAMES[review.source]
    ?? (review.source === "direct" ? t("verifiedBooking") : t("otherSource"));
  const replyDate = review.ownerReplyDate ? formatMonth(review.ownerReplyDate, locale) : "";
  const foldable = review.body.length > FOLD_BODY_CHARS || (review.ownerReply?.length ?? 0) > FOLD_REPLY_CHARS;
  const meta = [review.country, formatMonth(review.date, locale)].filter(Boolean).join(" · ");

  return (
    <article
      className="review-card"
      style={review.platformColor ? ({ "--platform": review.platformColor } as React.CSSProperties) : undefined}
    >
      <header className="review-card-head">
        <span className="review-card-avatar" style={{ background: avatarColor(review.name) }} aria-hidden="true">
          {initial(review.name)}
        </span>
        <span className="review-card-who">
          <strong>{review.name}</strong>
          <span>{meta}</span>
        </span>
        <span className="review-card-platform">{platformName}</span>
      </header>

      <div className="review-card-rating">
        <Stars n={review.rating} />
        {review.tripType && <span className="review-card-trip">{review.tripType}</span>}
      </div>

      <ReviewFold foldable={foldable} moreLabel={moreLabel} lessLabel={lessLabel}>
        <blockquote className="review-card-quote">
          {review.title && <h3 className="review-card-title">{review.title}</h3>}
          <p className="review-card-body">{review.body}</p>
        </blockquote>

        {review.ownerReply && (
          <div className="review-card-reply">
            <span className="review-card-reply-label">
              {ownerReplyLabel}
              {replyDate && <span> · {replyDate}</span>}
            </span>
            <p>{review.ownerReply}</p>
          </div>
        )}
      </ReviewFold>
    </article>
  );
}
