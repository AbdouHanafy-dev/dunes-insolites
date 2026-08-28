import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import CmsBlocks, { extractFaqs } from "@/components/CmsBlocks";
import LivePreview from "@/components/LivePreview";
import { getCmsPage } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";

const CMS_SLUG = "safety";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.safety" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/safety")),
  };
}

function faqJsonLdScript(faqs: { q: string; a: string }[]) {
  // Never emit an empty FAQPage — a schema with no real entries is worse
  // than no schema (DI-026: mark up real content, never invent it to
  // satisfy the schema).
  if (faqs.length === 0) return null;
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
  );
}

export default async function SafetyPage({
  searchParams,
}: {
  searchParams: Promise<{ livePreview?: string }>;
}) {
  const { livePreview } = await searchParams;

  if (livePreview === "1") {
    const t = await getTranslations("safety");
    return <LivePreview eyebrow={t("eyebrow")} />;
  }

  const locale = await getLocale();
  const [t, cms] = await Promise.all([getTranslations("safety"), getCmsPage(CMS_SLUG, locale)]);

  // A published "safety" page in the admin CMS takes over this route
  // entirely, FAQPage JSON-LD included (sourced from its own "faq" blocks,
  // not the hardcoded array below) — see ARCHITECTURE.md §10.6.
  if (cms && cms.blocks.length > 0) {
    return (
      <>
        {faqJsonLdScript(extractFaqs(cms.blocks))}
        <PageHead eyebrow={t("eyebrow")} title={cms.title} lead="" image="/images/quad.jpg" />
        <CmsBlocks blocks={cms.blocks} />
      </>
    );
  }

  const faqs = [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
    { q: t("faqQ5"), a: t("faqA5") },
    { q: t("faqQ6"), a: t("faqA6") },
  ];

  return (
    <>
      {faqJsonLdScript(faqs)}
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
