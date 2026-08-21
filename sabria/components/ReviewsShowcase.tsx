import Reveal from "@/components/Reveal";
import Stars from "@/components/Stars";
import PlatformBadge from "@/components/PlatformBadge";
import ReviewCarousel from "@/components/ReviewCarousel";
import { getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import type { Review } from "@/lib/types";

const SOURCE_ORDER: Review["source"][] = [
  "google",
  "airbnb",
  "booking",
  "tripadvisor",
  "getyourguide",
  "wetravel",
  "direct",
];

/**
 * The homepage's trust section — every review grouped by where it was
 * actually left, each with its own real average and an interactive
 * carousel. Activity/stay pages keep the simpler flat `Reviews` list;
 * this is the one place all platforms get shown side by side.
 */
export default async function ReviewsShowcase() {
  const all = await getReviews();
  if (!all.length) return null;

  const groups = SOURCE_ORDER.map((source) => ({
    source,
    reviews: all.filter((r) => r.source === source),
  })).filter((g) => g.reviews.length > 0);

  const avg = averageRating(all);

  return (
    <section className="block reviews-showcase" id="reviews">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">Reviews</p>
          <h2 className="sect-title" style={{ fontSize: "clamp(32px,4vw,60px)" }}>
            Why people love us.
          </h2>
          <div className="rating-line">
            <span className="score">{avg}</span>
            <Stars n={Math.round(Number(avg))} />
            <span className="of">
              from {all.length} review{all.length === 1 ? "" : "s"} across every platform we book
              through
            </span>
          </div>
        </Reveal>

        <div className="platform-groups">
          {groups.map(({ source, reviews }, i) => {
            const groupAvg = averageRating(reviews);
            return (
              <Reveal key={source} className="platform-group" delay={i * 80}>
                <div className="platform-header">
                  <PlatformBadge source={source} />
                  <div className="platform-rating">
                    <Stars n={Math.round(Number(groupAvg))} />
                    <span>
                      {groupAvg} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <ReviewCarousel reviews={reviews} />
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
