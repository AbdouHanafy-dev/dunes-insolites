import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTours } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";

/**
 * Homepage teaser for Route Insolite's multi-day circuits — published on
 * this vitrine since 18 Sep 2026 (business owner, explicit; see
 * docs/OPEN-QUESTIONS.md Q6's addendum). Placed right after Stays: the
 * nuitée at the camp is still the lead product, but a circuit is "more
 * nights at the same camp" (it overnights at Sabria), not an unrelated
 * cross-sell — so it reads next to the accommodation, not buried after the
 * booking CTA.
 *
 * Same field-guide row list as Activities.tsx rather than the 2-card grid
 * this used to be, so the three catalogue sections (stays/activities/
 * circuits) read as one consistent visual language instead of the teaser
 * looking like a bolted-on ad unit. Renders nothing if the catalogue is
 * empty (no fabricated content).
 */
export default async function Circuits() {
  const [tours, t] = await Promise.all([
    getTours(await getLocale()),
    getTranslations("circuitsSection"),
  ]);
  if (!tours.length) return null;

  return (
    <section className="block activities" id="circuits">
      <div className="wrap">
        <Reveal className="head">
          <p className="idx-label">
            {t("eyebrow")} — 01–{String(tours.length).padStart(2, "0")}
          </p>
          <h2 className="sect-title">{t("title")}</h2>
          <p>{t("lead")}</p>
        </Reveal>

        <div className="field-list">
          {tours.map((tour, i) => (
            <Reveal key={tour.slug} delay={i * 80}>
              <Link href={`/circuits/${tour.slug}`} className="field-row">
                <span className="idx-label field-row-idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="field-row-media">
                  {tour.coverImage ? (
                    <Image
                      src={tour.coverImage}
                      alt={tour.title}
                      fill
                      sizes="(max-width: 900px) 100vw, 320px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    // No cover photo uploaded for this Tour yet — a flat
                    // fill read as a rendering error when tried (found
                    // live, 18 Sep 2026). A visible placeholder instead.
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(217,154,92,.35), rgba(160,74,47,.18))",
                      }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ color: "var(--color-ember)", opacity: 0.55 }}>
                        <path d="M3 17l5-6 3 3 4-5 6 8" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="8" cy="7" r="2" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="field-row-body">
                  <span className="field-row-title">{tour.title}</span>
                  <span className="field-row-tagline">{tour.description}</span>
                  <span className="field-row-meta">
                    <span>{tour.duration}</span>
                    {tour.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{tour.location}</span>
                      </>
                    )}
                    {tour.groupSize && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{tour.groupSize}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="field-row-price">{t("fromPrice", { price: tour.priceFrom })}</span>
                <span className="field-row-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <p style={{ marginTop: 32 }}>
          <Link href="/circuits" className="editorial-link">
            {t("seeAll")}
          </Link>
        </p>
      </div>
    </section>
  );
}
