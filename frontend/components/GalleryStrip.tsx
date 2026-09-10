import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getGalleryStrip } from "@/lib/api";

/**
 * Restructured (differentiation pass, 31 Aug 2026) off the eyebrow +
 * display-title skeleton every other homepage section used to share, and
 * off the boxed, shadowed, hover-zoom card grid — both flagged in
 * audit-differentiation.md as matching the competitor's gallery mechanic.
 * Direction A calls for typed captions beneath a photo rather than text on
 * top of it, so each frame now carries a real index number and its alt
 * text as a caption underneath, contact-sheet style, instead of only
 * living in the img `alt` attribute.
 */
export default async function GalleryStrip() {
  const [galleryItems, t, tGrid] = await Promise.all([
    getGalleryStrip(),
    getTranslations("galleryStrip"),
    getTranslations("galleryGrid"),
  ]);
  // alt is keyed by the original English string in messages/*.json; falls
  // back to the raw string for any image not yet in the translation map.
  const altText = (raw: string) => (tGrid.has(`alt.${raw}`) ? tGrid(`alt.${raw}`) : raw);

  return (
    <section className="block log-gallery" id="gallery">
      <div className="wrap">
        <Reveal>
          <p className="log-index-kicker">{t("eyebrow")}</p>
          <h2 className="log-gallery-title serif">{t("title")}</h2>
        </Reveal>
        <Reveal className="log-gallery-strip">
          {galleryItems.map((item, i) => (
            <figure key={`${item.src}-${i}`} className={`log-gallery-item${item.tall ? " tall" : ""}`}>
              <div className="log-gallery-frame">
                <Image
                  src={item.src}
                  alt={altText(item.alt)}
                  fill
                  sizes="(max-width: 900px) 50vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <figcaption>
                <span className="log-num">{String(i + 1).padStart(2, "0")}</span>
                {altText(item.alt)}
              </figcaption>
            </figure>
          ))}
        </Reveal>
        <Link href="/gallery" className="log-link">
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
