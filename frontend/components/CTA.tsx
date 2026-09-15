import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Reused across ~14 pages with the same {title,body,href,label} signature —
 * kept unchanged so every existing call site (about, faq, safety, guides,
 * activities, camp, gallery, circuits…) needs no edit. Redesigned
 * internally (visual identity pass, 14 Sep 2026 — audit §14) off the
 * generic "full-bleed photo + centered heading + pill button" band: a
 * split layout instead, photo as a secondary element rather than another
 * hero. `place`/`note` are optional and additive — only the homepage
 * passes them (real facts: site address, a stay's actual arrival time),
 * every other call site renders the same split layout without that row.
 */
export default async function CTA({
  title,
  body,
  href = "/book",
  label,
  place,
  note,
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
  /** e.g. "Sabria · Kébili, Tunisia" — only pass real, verified copy. */
  place?: string;
  /** e.g. "Arrival around 16:00" — only pass a fact already in the data. */
  note?: string;
}) {
  // Defaults come from translations rather than parameter defaults, since a
  // parameter default can't be an awaited translation call. Callers that
  // pass their own title/body/label (most detail pages) skip this entirely.
  const t = await getTranslations("ctaDefault");

  return (
    <section className="block cta-split">
      <div className="cta-split-message">
        <h2 className="display">{title ?? t("title")}</h2>
        <p>{body ?? t("body")}</p>
        <Link href={href} className="btn-primary">
          {label ?? t("label")}
        </Link>
      </div>
      <div className="cta-split-media">
        <Image
          src="/images/gate.jpg"
          alt="Desert gate at dusk"
          fill
          sizes="(max-width: 900px) 100vw, 44vw"
          style={{ objectFit: "cover" }}
        />
        {(place || note) && (
          <div className="cta-split-facts">
            {place && <span className="idx-label cta-split-place">{place}</span>}
            {note && <span className="cta-split-note">{note}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
