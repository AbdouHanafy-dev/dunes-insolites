import Reveal from "@/components/Reveal";
import { getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";
import { REVIEW_SOURCE_LABELS } from "@/lib/types";

function Stars({ n }: { n: number }) {
  return (
    <div className="stars" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      <span style={{ opacity: 0.28 }}>{"★".repeat(5 - n)}</span>
    </div>
  );
}

export default async function Reviews({
  activitySlug,
  title = "What guests actually say.",
  limit = 6,
}: {
  activitySlug?: string;
  title?: string;
  limit?: number;
}) {
  const all = await getReviews(activitySlug);
  if (!all.length) return null;

  const shown = all.slice(0, limit);
  const avg = averageRating(all);

  return (
    <section className="block reviews" id="reviews">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">Reviews</p>
          <h2 className="sect-title" style={{ fontSize: "clamp(32px,4vw,60px)" }}>
            {title}
          </h2>
          <div className="rating-line">
            <span className="score">{avg}</span>
            <Stars n={Math.round(Number(avg))} />
            <span className="of">
              from {all.length} review{all.length === 1 ? "" : "s"} across TripAdvisor, Google, and
              direct bookings
            </span>
          </div>
        </Reveal>

        <div className="review-grid">
          {shown.map((r, i) => (
            <Reveal key={r.id} className="review" delay={i * 70}>
              <Stars n={r.rating} />
              <h3>{r.title}</h3>
              <p className="body">{r.body}</p>
              <div className="who">
                <span>
                  <span className="n">{r.name}</span>
                  <span style={{ color: "var(--muted)" }}> · {r.country}</span>
                </span>
                <span className="src">{REVIEW_SOURCE_LABELS[r.source]}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
