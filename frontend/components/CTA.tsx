import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getSiteImages } from "@/lib/api";

/**
 * Reused across ~14 pages with the same {title,body,href,label} signature —
 * kept unchanged so every existing call site (about, faq, safety, guides,
 * activities, camp, gallery, circuits…) needs no edit. Redesigned
 * internally (visual identity pass, 14 Sep 2026 — audit §14) off the
 * generic "full-bleed photo + centered heading + pill button" band: a
 * split layout instead, photo as a secondary element rather than another
 * hero. `note` is optional and additive — only the homepage passes it (a
 * stay's actual arrival time); every other call site renders the same
 * split layout without that row. (A `place` line used to sit beside it; it
 * repeated the address Location already states, so it was dropped.)
 */
export default async function CTA({
  title,
  body,
  href = "/book",
  label,
  note,
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
  /** e.g. "Arrival around 16:00" — only pass a fact already in the data. */
  note?: string;
}) {
  // Defaults come from translations rather than parameter defaults, since a
  // parameter default can't be an awaited translation call. Callers that
  // pass their own title/body/label (most detail pages) skip this entirely.
  const [t, images] = await Promise.all([getTranslations("ctaDefault"), getSiteImages()]);
  const tA = await getTranslations("a11y");

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
          src={images["home.cta"]}
          alt={tA("ctaGateAlt")}
          fill
          sizes="(max-width: 900px) 100vw, 44vw"
          style={{ objectFit: "cover" }}
        />
        {note && (
          <div className="cta-split-facts">
            <span className="cta-split-note">{note}</span>
          </div>
        )}
      </div>
    </section>
  );
}
