import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";

/**
 * The commercial reason this site exists: booking here costs the business
 * nothing in commission, so the guest can be given part of that back.
 *
 * The `DIRECT_DISCOUNT` figure below is a business decision, not a design one
 * — set it to whatever margin is actually being passed on, and make sure the
 * prices in lib/data/activities.ts reflect it. Claiming a saving that isn't
 * real is a misleading-pricing problem, not a copy problem.
 *
 * Redesigned (visual identity pass, 14 Sep 2026 — audit §13) off the
 * SaaS-style "us vs. them" two-column pricing table. Same real advantages
 * (the `here*` translation keys — nothing invented), presented as a
 * numbered editorial list with one strong CTA, no comparison column.
 */
const DIRECT_DISCOUNT = "15%";

// `override` is the "bookDirect" CMS block from the homepage's Page row
// (see app/[locale]/(site)/page.tsx) - deliberately never covers the
// headline above (DIRECT_DISCOUNT + titleLine1/titleDiscountSuffix), only
// the surrounding copy, so an editor can never publish a saving that
// doesn't match the real catalogue prices. Falls back to translations
// when no such block exists, same convention as about/faq. Only reads the
// homepage's own block; activities/page.tsx renders this section too,
// always with translations.
export default async function BookDirect({ override }: { override?: Record<string, unknown> } = {}) {
  const t = await getTranslations("bookDirect");

  const cmsAdvantages = Array.isArray(override?.advantages)
    ? (override.advantages as { text?: string }[]).map((a) => a.text ?? "").filter(Boolean)
    : [];
  const advantages =
    cmsAdvantages.length > 0
      ? cmsAdvantages
      : [t("here1"), t("here2"), t("here3"), t("here4"), t("here5"), t("here6")];

  const eyebrow = (typeof override?.eyebrow === "string" && override.eyebrow) || t("eyebrow");
  const lead = (typeof override?.lead === "string" && override.lead) || t("lead");
  const ctaLabel = (typeof override?.ctaLabel === "string" && override.ctaLabel) || t("cta");
  const headingHere = (typeof override?.headingHere === "string" && override.headingHere) || t("headingHere");

  return (
    <section className="block direct" id="book-direct">
      <div className="wrap direct-grid">
        <Reveal className="direct-intro">
          <p className="idx-label direct-eyebrow">{eyebrow}</p>
          <h2 className="sect-title">
            {t("titleLine1")}
            <br />
            {DIRECT_DISCOUNT} {t("titleDiscountSuffix")}
          </h2>
          <p className="lead">{lead}</p>
          <Link href="/book" className="btn-accent direct-cta">
            {ctaLabel}
          </Link>
        </Reveal>

        <Reveal className="direct-list">
          <span className="idx-label">{headingHere}</span>
          <ol>
            {advantages.map((text, i) => (
              <li key={text}>
                <span className="idx-label direct-num">{String(i + 1).padStart(2, "0")}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
