import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { Link } from "@/i18n/navigation";
import { routing, localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

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
  const t = await getTranslations({ locale, namespace: "meta.faq" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/faq")),
  };
}

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"] as const;

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const t = await getTranslations("faqPage");

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

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/faq") },
  ]);

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
