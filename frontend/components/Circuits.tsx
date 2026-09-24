import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTours } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getSiteImages } from "@/lib/api";

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
/** The homepage shows the first few circuits only; /circuits lists them all. */
const MAX_HOME_CIRCUITS = 4;

export default async function Circuits() {
  const [tours, t, images] = await Promise.all([
    getTours(await getLocale()),
    getTranslations("circuitsSection"),
    getSiteImages(),
  ]);
  if (!tours.length) return null;
  const featured = tours.slice(0, MAX_HOME_CIRCUITS);

  return (
    <section className="block route-ledger route-ledger--grid" id="circuits">
      <div className="wrap route-ledger-layout">
        <Reveal className="route-ledger-intro">
          <p className="idx-label">{t("eyebrow")}</p>
          <h2 className="sect-title">{t("title")}</h2>
          <p>{t("lead")}</p>
        </Reveal>

        <div className="route-dossiers">
          {featured.map((tour, i) => (
            <Reveal key={tour.slug} delay={i * 80}>
              <Link href={`/circuits/${tour.slug}`} className="route-dossier">
                <span className="route-dossier-media">
                  <Image
                    src={tour.coverImage || images["circuit.default"]}
                    alt={tour.title}
                    fill
                    sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 360px"
                    style={{ objectFit: "cover" }}
                  />
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

        <Reveal className="route-ledger-more">
          <Link href="/circuits" className="btn-accent">
            {t("seeAll")}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
