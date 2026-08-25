import Reveal from "@/components/Reveal";
import Stars from "@/components/Stars";
import PlatformBadge from "@/components/PlatformBadge";
import { getReviews } from "@/lib/api";
import { averageRating } from "@/lib/data/reviews";

export default async function Reviews({
  activitySlug,
  staySlug,
  title = "What guests actually say.",
  limit = 6,
}: {
  activitySlug?: string;
  staySlug?: string;
  title?: string;
  limit?: number;
}) {
  const all = await getReviews({ activitySlug, staySlug });
  if (!all.length) return null;

  const shown = [...all]
    .sort((a, b) => b.rating - a.rating || +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
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
              from {all.length} review{all.length === 1 ? "" : "s"} across our booking platforms and
              direct guests
            </span>
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
                  <span style={{ color: "var(--muted)" }}> · {r.country}</span>
                </span>
                <PlatformBadge source={r.source} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
