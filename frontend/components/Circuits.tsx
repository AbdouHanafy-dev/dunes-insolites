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
 * The homepage redesign gives circuits their own route-dossier composition:
 * image-led, staggered and slower than the practical activity index below.
 * It still renders only catalogue data and disappears when that catalogue
 * is empty (no fabricated content).
 */
export default async function Circuits() {
  const [tours, t] = await Promise.all([
    getTours(await getLocale()),
    getTranslations("circuitsSection"),
  ]);
  if (!tours.length) return null;

  return (
    <section className="block route-ledger" id="circuits">
      <div className="wrap route-ledger-layout">
        <Reveal className="route-ledger-intro">
          <p className="idx-label">{t("eyebrow")}</p>
          <h2 className="sect-title">{t("title")}</h2>
          <p>{t("lead")}</p>
          <Link href="/circuits" className="editorial-link">
            {t("seeAll")}
          </Link>
        </Reveal>

        <div className="route-dossiers">
          {tours.map((tour, i) => (
            <Reveal key={tour.slug} delay={i * 80}>
              <Link href={`/circuits/${tour.slug}`} className="route-dossier">
                <span className="route-dossier-media">
                  {tour.coverImage ? (
                    <Image
                      src={tour.coverImage}
                      alt={tour.title}
                      fill
                      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 360px"
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
                <span className="route-dossier-cap">
                  <span className="route-dossier-topline">
                    <span className="idx-label">{String(i + 1).padStart(2, "0")}</span>
                    <span>{tour.duration}</span>
                  </span>
                  <strong>{tour.title}</strong>
                  <span className="route-dossier-description">{tour.description}</span>
                  <span className="route-dossier-meta">
                    {tour.location && (
                      <span>{tour.location}</span>
                    )}
                    {tour.groupSize && (
                      <span>{tour.groupSize}</span>
                    )}
                    <span>{t("fromPrice", { price: tour.priceFrom })}</span>
                  </span>
                  <span className="route-dossier-arrow" aria-hidden="true">↗</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
