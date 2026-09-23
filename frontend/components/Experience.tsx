import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";

/**
 * Trimmed (landing-page pass, 23 Sep 2026): this band used to repeat the
 * hero's three headline figures and then the coordinates and address that the
 * Location section states in full. The same facts three times on one page read
 * as padding, so it is back to what only this band does - one photo and the
 * one-line promise of the trip. Figures: Hero. Place: Location.
 */
export default async function Experience() {
  const t = await getTranslations("experience");

  return (
    <section className="block exp-proof" id="experience">
      <div className="exp-proof-media">
        <Image
          src="/images/hero-combined.jpg"
          alt={t("bgAlt")}
          fill
          sizes="(max-width: 900px) 100vw, 46vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="exp-proof-content">
        <Reveal className="exp-proof-statement">
          <h2 className="display">{t("heading")}</h2>
          <p>{t("body")}</p>
        </Reveal>
      </div>
    </section>
  );
}
