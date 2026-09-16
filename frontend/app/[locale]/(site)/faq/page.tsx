import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import CmsBlocks, { extractFaqs } from "@/components/CmsBlocks";
import { getCmsPage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { routing, localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";

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

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"] as const;

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

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
    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: extractFaqs(cms.blocks).map((f) => ({
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
        <Breadcrumbs items={breadcrumbItems} />
        <PageHead eyebrow={t("eyebrow")} title={cms.title} lead="" image="/images/quad.jpg" />
        <CmsBlocks blocks={cms.blocks} />
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

  const faqs = QUESTION_KEYS.map((key) => ({
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
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/quad.jpg" />

      <section className="section-sand">
        <div className="wrap">
          {groups.map((group) => (
            <Reveal className="prose" key={group.heading}>
              <h2>{group.heading}</h2>
              {group.items.map((item) => (
                <div key={item.q}>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </div>
              ))}
            </Reveal>
          ))}

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
