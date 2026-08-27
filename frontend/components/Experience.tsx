import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getStats } from "@/lib/api";

export default async function Experience() {
  const [stats, t] = await Promise.all([getStats(), getTranslations("experience")]);

  return (
    <section className="block exp" id="experience">
      <div className="bg">
        <Image
          src="/images/hero-combined.jpg"
          alt="Sabria desert scene"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <Reveal className="wrap">
        <h2 className="serif">{t("heading")}</h2>
        <p>{t("body")}</p>
        <div className="stats">
          <div className="stat">
            <div className="v serif">{stats.guestsGuided}</div>
            <div className="k">{t("guestsGuided")}</div>
          </div>
          <div className="stat">
            <div className="v serif">{stats.avgRating}</div>
            <div className="k">{t("averageRating")}</div>
          </div>
          <div className="stat">
            <div className="v serif">{stats.yearsRunning}</div>
            <div className="k">{t("onTheDunes")}</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
