import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { getStats } from "@/lib/api";
import { site } from "@/lib/site";

/**
 * Redesigned (visual identity pass, 14 Sep 2026 — see
 * docs/reports/visual-design-audit-2026-09-14.md, §11) off the generic
 * "three equal stats over a photo" band. Same real data (`getStats()`) and
 * the same translated heading/body — the audit's complaint was never the
 * facts, it was the startup-KPI layout. Facts now read as a vertical,
 * thin-ruled list beside a full-height photo, closing on the one fact
 * nothing else on the page states outright: where this actually is.
 */
export default async function Experience() {
  const [stats, t] = await Promise.all([getStats(), getTranslations("experience")]);
  const years = stats.yearsRunning.match(/\d+/)?.[0] ?? stats.yearsRunning;
  const coords = `${site.coords.lat.toFixed(4)}° N · ${site.coords.lng.toFixed(4)}° E`;

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
        <Reveal className="exp-proof-facts">
          <div className="exp-fact">
            <span className="exp-fact-v display">{stats.guestsGuided}</span>
            <span className="exp-fact-k">{t("guestsGuided")}</span>
          </div>
          <div className="exp-fact-rule" aria-hidden="true" />
          <div className="exp-fact">
            <span className="exp-fact-v display">{stats.avgRating ?? t("newRating")}</span>
            <span className="exp-fact-k">{t("averageRating")}</span>
          </div>
          <div className="exp-fact-rule" aria-hidden="true" />
          <div className="exp-fact">
            <span className="exp-fact-v display">
              {years}+ {t("yearsUnit")}
            </span>
            <span className="exp-fact-k">{t("onTheDunes")}</span>
          </div>
          <div className="exp-fact-rule" aria-hidden="true" />
          <div className="exp-fact exp-fact-place">
            <span className="idx-label">{coords}</span>
            <span className="exp-fact-k">Sabria · {site.address}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
