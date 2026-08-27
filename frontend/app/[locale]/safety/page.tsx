import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Safety",
    description:
      "How Dunes Insolites keeps desert trips safe: guide ratios, equipment checks, heat protocol, medical cover, and what to bring.",
    alternates: localeAlternates(locale, (l) => localeHref(l, "/safety")),
  };
}

export default async function SafetyPage() {
  const t = await getTranslations("safety");

  const faqs = [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
    { q: t("faqQ5"), a: t("faqA5") },
    { q: t("faqQ6"), a: t("faqA6") },
  ];

  // FAQPage schema (DI-026/SEO-07) — marks up the real, now-translated Q&A
  // above, not invented copy for the purpose of the schema.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/quad.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <Reveal className="prose">
            <h2>{t("onEveryTripHeading")}</h2>
            <ul>
              <li>{t("onEveryTrip1")}</li>
              <li>{t("onEveryTrip2")}</li>
              <li>{t("onEveryTrip3")}</li>
              <li>{t("onEveryTrip4")}</li>
              <li>{t("onEveryTrip5")}</li>
            </ul>

            <h2>{t("heatProtocolHeading")}</h2>
            <p>{t("heatProtocolBody")}</p>

            <h2>{t("insuranceHeading")}</h2>
            <p>{t("insuranceP1")}</p>
            <p>{t("insuranceP2")}</p>

            <h2>{t("whatToBringHeading")}</h2>
            <ul>
              <li>{t("bring1")}</li>
              <li>{t("bring2")}</li>
              <li>{t("bring3")}</li>
              <li>{t("bring4")}</li>
              <li>{t("bring5")}</li>
            </ul>
          </Reveal>

          <Reveal>
            <div className="faq">
              <p className="sect-eyebrow">{t("commonQuestionsEyebrow")}</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(28px,3.4vw,46px)", marginBottom: 28 }}>
                {t("commonQuestionsHeading")}
              </h2>
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CTA title={t("ctaTitle")} body={t("ctaBody")} href="/contact" label={t("ctaLabel")} />
    </>
  );
}
