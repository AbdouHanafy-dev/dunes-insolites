import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getGalleryStrip } from "@/lib/api";

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
    <section className="block gallery" id="gallery">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">{t("eyebrow")}</p>
          <h2 className="sect-title">{t("title")}</h2>
        </Reveal>
        <Reveal className="strip">
          {galleryItems.map((item, i) => (
            <div key={`${item.src}-${i}`} className={`g${item.tall ? " tall" : ""}`}>
              <Image
                src={item.src}
                alt={altText(item.alt)}
                fill
                sizes="(max-width: 900px) 50vw, 33vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </Reveal>
        <div style={{ marginTop: 40 }}>
          <Link href="/gallery" className="btn-quiet">
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
