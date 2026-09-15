import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getStays } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";

/**
 * Redesigned (visual identity pass, 14 Sep 2026 — see
 * docs/reports/visual-design-audit-2026-09-14.md, §6) off the identical
 * eyebrow/headline/3-card-grid skeleton this used to share with
 * Activities.tsx. Stays is hospitality: one real place shown large, with
 * real amenities and a price, then the rest as a quiet editorial list —
 * not a row of interchangeable product tiles. Activities.tsx (below) uses
 * a deliberately different composition (a field-guide list) so the two
 * sections stop reading as the same component twice.
 *
 * Copy now runs through next-intl (`staysSection`, all 6 locales) instead
 * of the hardcoded English this section previously shipped — a gap the
 * redesign itself introduced and then closed. The CTA reuses
 * `accommodationCard.exploreThisStay`, already translated and already
 * carrying its own arrow glyph.
 */
export default async function Stays() {
  const [stays, t, tCard] = await Promise.all([
    getStays(await getLocale()),
    getTranslations("staysSection"),
    getTranslations("accommodationCard"),
  ]);
  const [featured, ...rest] = stays;
  if (!featured) return null;

  return (
    <section className="block stays" id="stays">
      <div className="wrap">
        <Reveal className="head">
          <p className="idx-label">
            {t("eyebrow")} — 01–{String(stays.length).padStart(2, "0")}
          </p>
          <h2 className="sect-title">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>
          <p>{t("lead")}</p>
        </Reveal>

        <Reveal className="stay-feature">
          <div className="stay-feature-media">
            <Image
              src={featured.image}
              alt={featured.tagline}
              fill
              sizes="(max-width: 900px) 100vw, 56vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="stay-feature-body">
            <span className="idx-label">01 / {featured.kicker}</span>
            <h3 className="display">{featured.title}</h3>
            <p>{featured.description}</p>
            {featured.included.length > 0 && (
              <ul className="stay-amenities">
                {featured.included.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <div className="stay-feature-meta">
              <span>{t("fromPrice", { price: featured.priceFrom })}</span>
              <span aria-hidden="true">·</span>
              <span>{featured.groupSize}</span>
            </div>
            <Link href={`/camp/${featured.slug}`} className="editorial-link">
              {tCard("exploreThisStay")}
            </Link>
          </div>
        </Reveal>

        {rest.length > 0 && (
          <div className="stay-list">
            {rest.map((stay, i) => (
              <Reveal key={stay.slug} delay={i * 80}>
                <Link href={`/camp/${stay.slug}`} className="stay-row">
                  <span className="idx-label">{String(i + 2).padStart(2, "0")}</span>
                  <span className="stay-row-media">
                    <Image
                      src={stay.image}
                      alt={stay.tagline}
                      fill
                      sizes="(max-width: 900px) 40vw, 220px"
                      style={{ objectFit: "cover" }}
                    />
                  </span>
                  <span className="stay-row-body">
                    <span className="stay-row-title">{stay.title}</span>
                    <span className="stay-row-tagline">{stay.tagline}</span>
                  </span>
                  <span className="stay-row-price">{t("fromPrice", { price: stay.priceFrom })}</span>
                  <span className="stay-row-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
