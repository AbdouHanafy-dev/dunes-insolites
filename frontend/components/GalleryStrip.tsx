import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getGalleryStrip } from "@/lib/api";
import { isDisplayableImageSrc } from "@/lib/imageSrc";

/**
 * Simplified (14 Sep 2026, on request) off the asymmetric "tall item"
 * contact-sheet grid — with two tall items landing in different columns,
 * CSS grid's dense auto-placement gave the row uneven, ragged bottoms
 * (one column two rows deep, another three), which read as an accident
 * rather than a deliberate layout. A clean, even grid instead: same
 * aspect ratio throughout, tighter gaps, less dead air, a quieter
 * single-line caption. Still numbered — that's not what didn't work here.
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
          <h2 className="log-gallery-title display">{t("title")}</h2>
        </Reveal>
        <Reveal className="log-gallery-strip">
          {galleryItems.map((item, i) => (
            <figure key={`${item.src}-${i}`} className="log-gallery-item">
              <div className="log-gallery-frame">
                {isDisplayableImageSrc(item.src) && (
                  <Image
                    src={item.src}
                    alt={altText(item.alt)}
                    fill
                    sizes="(max-width: 900px) 50vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                )}
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
