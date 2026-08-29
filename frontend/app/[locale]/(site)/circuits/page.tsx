import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

/**
 * DI-024 — a real, honest destination for the legacy WordPress circuit URLs
 * (Ksar Ghilane, Tataouine/Chenini, Douz-Matmata, 4x4, the 2/3/4/6-day
 * excursions) that this vitrine does NOT rebuild content for: multi-day
 * touring is Route Insolite's product, not this one (see CLAUDE.md — "Do
 * not add multi-day touring to the Dunes vitrine"). Route Insolite hasn't
 * launched yet (R4), so redirecting straight to a live product page isn't
 * possible; 301-ing to the homepage is explicitly the wrong move (Google
 * reads it as a soft 404). This page exists so those URLs keep a real,
 * on-topic destination instead of either — no fabricated availability or
 * booking, just an honest "coming soon" with a path to what IS bookable
 * today. See docs/OPEN-QUESTIONS.md Q6 and docs/ROADMAP.md DI-024.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.circuits" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/circuits")),
  };
}

export default async function CircuitsPage() {
  const t = await getTranslations("circuitsPage");
  const destinations = t.raw("destinations") as string[];

  return (
    <>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/quad.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <Reveal>
            <p className="sect-eyebrow">{t("destinationsLabel")}</p>
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                listStyle: "none",
                padding: 0,
                marginTop: 20,
              }}
            >
              {destinations.map((d) => (
                <li
                  key={d}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 999,
                    padding: "10px 20px",
                    fontSize: 15,
                  }}
                >
                  {d}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 24 }}>
              <Link href="/contact" className="link-quiet">
                {t("ctaSecondaryLabel")}
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      <CTA title={t("title")} body={t("lead")} href="/activities" label={t("ctaLabel")} />
    </>
  );
}
