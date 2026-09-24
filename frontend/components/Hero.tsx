import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";
import { getSiteImages } from "@/lib/api";
import type { Stats } from "@/lib/types";

export default async function Hero({ stats }: { stats: Stats }) {
  const [t, images] = await Promise.all([getTranslations("hero"), getSiteImages()]);
  const years = stats.yearsRunning.match(/\d+/)?.[0] ?? stats.yearsRunning;

  return (
    <section className="static-gate-hero" aria-labelledby="static-gate-title">
      <div className="static-gate-frame" aria-hidden="true">
        <Image
          className="static-gate-plate"
          src={images["home.hero"]}
          alt=""
          fill
          sizes="100vw"
          preload
          loading="eager"
        />
        <div className="static-gate-shade" />
      </div>

      <div className="static-gate-content">
        <div className="static-gate-word">
          <p>{site.name} · Sabria · Southern Tunisia</p>
          <h1 id="static-gate-title">{site.hero}</h1>
        </div>

        <div className="static-gate-copy">
          <p>{site.tagline}</p>
          <div className="static-gate-actions">
            <Link href="/activities" className="static-gate-primary">
              {t("exploreExperiences")} <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/about" className="static-gate-secondary">
              {t("discoverSabria")}
            </Link>
          </div>
        </div>

      </div>

      <dl className="static-gate-stats">
        <div>
          <dd>{stats.guestsGuided}</dd>
          <dt>{t("guestsGuided")}</dt>
        </div>
        <div>
          <dd>{years}+</dd>
          <dt>{t("ofExperience")}</dt>
        </div>
      </dl>
    </section>
  );
}
