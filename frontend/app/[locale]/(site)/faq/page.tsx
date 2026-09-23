import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import FaqTabs from "@/components/FaqTabs";
import CTA from "@/components/CTA";
import CmsBlocks, { extractFaqs } from "@/components/CmsBlocks";
import { getCmsPage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { routing, localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

const CMS_SLUG = "faq";

// Now translated into all 6 locales (fr/en/de/it/da/ar) - was FR/EN-only
// when this page first shipped.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.faq" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/faq")),
  };
}

const BASE_QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"] as const;
const RESEARCHED_QUESTION_KEYS = [
  "q10", "q11", "q12", "q13", "q14", "q15",
  "q16", "q17", "q18", "q19", "q20", "q21", "q22", "q23", "q24",
] as const;
const FAQ_SOURCES = [
  ["UNESCO · Djerba", "https://whc.unesco.org/en/list/1640"],
  ["Discover Tunisia · Tataouine", "https://www.discovertunisia.com/en/discover/around-tataouine"],
  ["Discover Tunisia · Douz", "https://www.discovertunisia.com/en/discover/around-douz"],
  ["Dunes Insolites · Official site", "https://www.dunes-insolites.com/"],
  ["Dunes Insolites · About the camp", "https://www.dunes-insolites.com/presentation-campement-dunes-insolites/"],
  ["France Diplomatie · Tunisie", "https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/tunisie/"],
] as const;

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const normalizedLocale = locale.toLowerCase();

  const [t, tNav, cms] = await Promise.all([
    getTranslations("faqPage"),
    getTranslations("nav"),
    getCmsPage(CMS_SLUG, locale),
  ]);

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/faq") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  // A published "faq" page in the admin CMS (richText category headings
  // alternating with faq blocks) takes over the Q&A content below - the
  // "still questions" CTA stays code, same convention as About's
  // Experience/CTA. Falls back to the translation-file version below when
  // no such page has been published yet, so forgetting to fill it in never
  // blanks this live, indexed route.
  if (cms && cms.blocks.length > 0) {
    const cmsFaqs = extractFaqs(cms.blocks);
    const cmsQuestions = new Set(cmsFaqs.map((faq) => faq.q.trim().toLocaleLowerCase(normalizedLocale)));
    const researchedFaqs = normalizedLocale === "fr" || normalizedLocale === "en"
      ? RESEARCHED_QUESTION_KEYS
          .map((key) => ({ q: t(key), a: t(`a${key.slice(1)}`) }))
          .filter((faq) => !cmsQuestions.has(faq.q.trim().toLocaleLowerCase(normalizedLocale)))
      : [];
    const destinationFaqs = researchedFaqs.slice(0, 6);
    const campFaqs = researchedFaqs.slice(6);
    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [...cmsFaqs, ...researchedFaqs].map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <PageHead eyebrow={t("eyebrow")} title={cms.title} lead="" image="/images/quad.jpg" />
        <div className="faq-cms">
          <CmsBlocks blocks={cms.blocks} />
        </div>
        {researchedFaqs.length > 0 && (
          <section className="section-sand faq-researched">
            <div className="wrap">
              <FaqTabs
                groups={[
                  ...(destinationFaqs.length > 0 ? [{ id: "destination", heading: t("catDestination"), items: destinationFaqs }] : []),
                  ...(campFaqs.length > 0 ? [{ id: "camp", heading: t("catCamp"), items: campFaqs }] : []),
                ]}
              />
              
              <Reveal className="prose faq-sources">
                <h2>{t("sourcesHeading")}</h2>
                <p>{t("sourcesNote")}</p>
                <ul>
                  {FAQ_SOURCES.map(([label, href]) => (
                    <li key={href}><a href={href} target="_blank" rel="noreferrer noopener">{label} ↗</a></li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>
        )}
        <section className="section-sand">
          <div className="wrap">
            <Reveal className="prose">
              <p>
                {t("stillQuestions")} <Link href="/contact">{t("contactCta")}</Link>
              </p>
            </Reveal>
          </div>
        </section>
        <CTA />
      </>
    );
  }

  const questionKeys = normalizedLocale === "fr" || normalizedLocale === "en"
    ? [...BASE_QUESTION_KEYS, ...RESEARCHED_QUESTION_KEYS]
    : [...BASE_QUESTION_KEYS];
  const faqs = questionKeys.map((key) => ({
    q: t(key),
    a: t(`a${key.slice(1)}`),
  }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const groups = [
    { heading: t("catBooking"), items: faqs.slice(0, 3) },
    { heading: t("catPractical"), items: faqs.slice(3, 6) },
    { heading: t("catAge"), items: faqs.slice(6, 9) },
    ...(faqs.length > 9 ? [
      { heading: t("catDestination"), items: faqs.slice(9, 15) },
      { heading: t("catCamp"), items: faqs.slice(15, 24) },
    ] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/quad.jpg" />

      <section className="section-sand faq-page-section">
        <div className="wrap">
          <FaqTabs groups={groups.map((group, index) => ({ id: String(index), heading: group.heading, items: group.items }))} />

          {faqs.length > 9 && (
            <Reveal className="prose faq-sources">
              <h2>{t("sourcesHeading")}</h2>
              <p>{t("sourcesNote")}</p>
              <ul>
                {FAQ_SOURCES.map(([label, href]) => (
                  <li key={href}><a href={href} target="_blank" rel="noreferrer noopener">{label} ↗</a></li>
                ))}
              </ul>
            </Reveal>
          )}

          <Reveal className="prose">
            <p>
              {t("stillQuestions")}{" "}
              <Link href="/contact">{t("contactCta")}</Link>
            </p>
          </Reveal>
        </div>
      </section>

      <CTA />
    </>
  );
}
