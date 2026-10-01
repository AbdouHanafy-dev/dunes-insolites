import Reveal from "@/components/Reveal";
import Stars from "@/components/Stars";
import PlatformBadge from "@/components/PlatformBadge";
import { getReviews, getSiteSettings } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { getTranslations } from "next-intl/server";

export default async function Reviews({
  activitySlug,
  staySlug,
  tourSlug,
  title,
  limit = 6,
}: {
  activitySlug?: string;
  staySlug?: string;
  tourSlug?: string;
  title?: string;
  limit?: number;
}) {
  const filters = { activitySlug, staySlug, tourSlug };
  const [productReviews, settings, t] = await Promise.all([
    getReviews(filters),
    getSiteSettings(),
    getTranslations("reviewsShowcase"),
  ]);
  // Prefer reviews attached to this catalogue item. If none are linked yet,
  // show the business's real general reviews instead of hiding all social proof.
  const all = productReviews.length > 0
    ? productReviews
    : (activitySlug || staySlug || tourSlug) ? await getReviews() : productReviews;
  if (!all.length) return null;
  const heading = productReviews.length > 0 ? (title ?? t("title")) : t("title");

  const shown = [...all]
    .sort((a, b) => b.rating - a.rating || +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
  const avg = averageRating(all);
  const googleHref = settings.googlePlaceId
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(settings.googlePlaceId)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  const sourceLabel = (source: string) => {
    if (source === "direct") return t("verifiedBooking");
    if (source === "other") return t("otherSource");
    return undefined;
  };

  return (
    <section className="block reviews" id="reviews">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">{t("eyebrow")}</p>
          <h2 className="sect-title" style={{ fontSize: "clamp(32px,4vw,60px)" }}>
            {heading}
          </h2>
          <div className="rating-line">
            <span className="score">{avg}</span>
            <Stars n={Math.round(Number(avg))} />
            <span className="of">
              {all.length === 1
                ? t("reviewCountOne", { count: all.length })
                : t("reviewCountOther", { count: all.length })}
            </span>
            <a href={googleHref} target="_blank" rel="noreferrer noopener" className="editorial-link">
              {t("seeAllOnGoogle")} ↗
            </a>
          </div>
        </Reveal>

        <div className="review-grid">
          {shown.map((r, i) => (
            <Reveal key={r.id} className="review" delay={i * 70}>
              <Stars n={r.rating} />
              {r.title && <h3>{r.title}</h3>}
              <p className="body">{r.body}</p>
              <div className="who">
                <span>
                  <span className="n">{r.name}</span>
                  {r.country && <span style={{ color: "var(--muted)" }}> · {r.country}</span>}
                </span>
                <PlatformBadge source={r.source} name={r.platformName ?? sourceLabel(r.source)} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
