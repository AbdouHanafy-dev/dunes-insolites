import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Accommodation } from "@/lib/types";
import { isDisplayableImageSrc } from "@/lib/imageSrc";

/**
 * Redesigned (visual identity pass, 14 Sep 2026 — audit §6/§8): index label
 * instead of a bare price line, a real features list (already on the
 * `Accommodation` type, previously unused here), less shadow/radius than
 * the old 22px + drop-shadow "generic card" treatment.
 */
export default async function AccommodationCard({
  staySlug,
  accommodation,
  index,
}: {
  staySlug: string;
  accommodation: Accommodation;
  /** 1-based position among this stay's accommodations, for the "01 /
   *  TENT" index label — optional so the component still renders without
   *  it. */
  index?: number;
}) {
  const t = await getTranslations("accommodationCard");

  return (
    <article className="accommodation-card">
      <div className="accommodation-image">
        {isDisplayableImageSrc(accommodation.image) && (
          <Image src={accommodation.image} alt={accommodation.title} fill sizes="(max-width: 700px) 100vw, 33vw" />
        )}
      </div>
      <div className="accommodation-copy">
        {index != null && (
          <span className="idx-label">{String(index).padStart(2, "0")} / {accommodation.title}</span>
        )}
        <h3>{accommodation.title}</h3>
        <p>{accommodation.tagline || accommodation.description}</p>
        {accommodation.features.length > 0 && (
          <ul className="accommodation-features">
            {accommodation.features.slice(0, 3).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <div className="accommodation-meta">
          <span>From €{accommodation.priceFrom}</span>
          <span aria-hidden="true">·</span>
          <span>{accommodation.sleeps}</span>
        </div>
        <Link
          href={`/camp/${staySlug}/${accommodation.slug}`}
          className="editorial-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("exploreThisStay")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
