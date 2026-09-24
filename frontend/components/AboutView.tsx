import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";
import { getSiteImages } from "@/lib/api";

type ExperienceItem = { title: string; text: string; cta: string; href: string };
type TextItem = { title: string; text: string };

/**
 * "Qui sommes-nous ?" — the camp's story, in nine sections that lead the
 * visitor towards the accommodation, the activities and the booking form.
 * Only facts the owner supplied are stated (the camp is about 3 km from
 * Sabria, reachable in a regular car, etc.); the team photo is a
 * placeholder to be replaced by a real one.
 */
export default async function AboutView() {
  const [t, images] = await Promise.all([getTranslations("aboutPage"), getSiteImages()]);
  // Every photo here is a replaceable slot ("Photos du site" in the back office).
  const PHOTO = {
    hero: images["about.hero"],
    story: images["about.story"],
    sleep: images["about.sleep"],
    traditions: images["about.traditions"],
    dunes: images["about.dunes"],
    share: images["about.share"],
    team: images["about.team"],
    final: images["about.final"],
  } as const;
  const experience = t.raw("experience.items") as ExperienceItem[];
  const why = t.raw("why.items") as TextItem[];
  const values = t.raw("values.items") as TextItem[];
  const words = t.raw("philosophy.words") as string[];
  const stops = t.raw("region.stops") as string[];
  const experiencePhotos = [PHOTO.sleep, PHOTO.traditions, PHOTO.dunes, PHOTO.share];

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${site.coords.lng - 0.35}%2C${
    site.coords.lat - 0.25
  }%2C${site.coords.lng + 0.35}%2C${site.coords.lat + 0.25}&layer=mapnik&marker=${site.coords.lat}%2C${site.coords.lng}`;

  return (
    <div className="ab">
      {/* 1 — Hero */}
      <section className="ab-hero">
        <Image src={PHOTO.hero} alt="" fill priority sizes="100vw" className="ab-hero-img" />
        <div className="ab-hero-shade" />
        <div className="wrap ab-hero-inner">
          <p className="ab-eyebrow ab-eyebrow--light">{t("hero.eyebrow")}</p>
          <h1>{t("hero.title")}</h1>
          <p className="ab-hero-lead">{t("hero.lead")}</p>
          <Link href="/camp" className="ab-btn ab-btn--light">
            {t("hero.cta")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* 2 — Story */}
      <section className="ab-section ab-story">
        <div className="wrap ab-split">
          <Reveal className="ab-photo">
            <Image src={PHOTO.story} alt={t("story.photoAlt")} fill sizes="(max-width: 900px) 100vw, 50vw" />
          </Reveal>
          <Reveal className="ab-copy" delay={100}>
            <p className="ab-eyebrow">{t("story.eyebrow")}</p>
            <h2>{t("story.title")}</h2>
            <p>{t("story.p1")}</p>
            <p>{t("story.p2")}</p>
            <Link href="/camp" className="ab-link">
              {t("story.cta")} <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 3 — Experience */}
      <section className="ab-section ab-experience">
        <div className="wrap">
          <Reveal className="ab-head">
            <p className="ab-eyebrow">{t("experience.eyebrow")}</p>
            <h2>{t("experience.title")}</h2>
          </Reveal>
          <div className="ab-grid ab-grid--4">
            {experience.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <Link href={item.href} className="ab-card ab-card--photo">
                  <span className="ab-card-media">
                    <Image src={experiencePhotos[i]} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                  </span>
                  <span className="ab-card-body">
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                    <span className="ab-link ab-link--small">
                      {item.cta} <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Philosophy */}
      <section className="ab-section ab-philosophy">
        <div className="wrap">
          <Reveal className="ab-philosophy-inner">
            <p className="ab-eyebrow ab-eyebrow--amber">{t("philosophy.eyebrow")}</p>
            <h2>{t("philosophy.title")}</h2>
            <p>{t("philosophy.text")}</p>
            <ul className="ab-words">
              {words.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 5 — Why choose */}
      <section className="ab-section">
        <div className="wrap">
          <Reveal className="ab-head">
            <p className="ab-eyebrow">{t("why.eyebrow")}</p>
            <h2>{t("why.title")}</h2>
          </Reveal>
          <div className="ab-grid ab-grid--3">
            {why.map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) * 80}>
                <div className="ab-card ab-card--plain">
                  <span className="ab-num">{String(i + 1).padStart(2, "0")}</span>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — Team */}
      <section className="ab-section ab-team">
        <div className="wrap">
          <Reveal className="ab-team-photo">
            <Image src={PHOTO.team} alt={t("team.photoAlt")} fill sizes="(max-width: 1200px) 100vw, 1120px" />
          </Reveal>
          <Reveal className="ab-team-copy" delay={100}>
            <div>
              <p className="ab-eyebrow">{t("team.eyebrow")}</p>
              <h2>{t("team.title")}</h2>
            </div>
            <div>
              <p>{t("team.text")}</p>
              <Link href="/contact" className="ab-link">
                {t("team.cta")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7 — Region */}
      <section className="ab-section ab-region">
        <div className="wrap ab-split">
          <Reveal className="ab-copy">
            <p className="ab-eyebrow">{t("region.eyebrow")}</p>
            <h2>{t("region.title")}</h2>
            <p>{t("region.text")}</p>
            <p className="ab-stops-label">{t("region.stopsLabel")}</p>
            <ul className="ab-stops">
              {stops.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <Link href="/circuits" className="ab-link">
              {t("region.cta")} <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
          <Reveal className="ab-map" delay={100}>
            <iframe src={mapSrc} title={t("region.mapTitle")} loading="lazy" />
          </Reveal>
        </div>
      </section>

      {/* 8 — Values */}
      <section className="ab-section ab-values">
        <div className="wrap">
          <Reveal className="ab-head">
            <p className="ab-eyebrow">{t("values.eyebrow")}</p>
            <h2>{t("values.title")}</h2>
          </Reveal>
          <div className="ab-grid ab-grid--4">
            {values.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="ab-value">
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9 — Final call to action */}
      <section className="ab-final">
        <Image src={PHOTO.final} alt="" fill sizes="100vw" className="ab-final-img" />
        <div className="ab-hero-shade" />
        <Reveal className="wrap ab-final-inner">
          <h2>{t("final.title")}</h2>
          <p>{t("final.text")}</p>
          <div className="ab-actions">
            <Link href="/camp" className="ab-btn ab-btn--light">
              {t("final.accommodations")}
            </Link>
            <Link href="/activities" className="ab-btn ab-btn--ghost">
              {t("final.experiences")}
            </Link>
            <Link href="/book" className="ab-btn ab-btn--terracotta">
              {t("final.book")} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
