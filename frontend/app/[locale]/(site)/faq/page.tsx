import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { Link } from "@/i18n/navigation";
import { localeHref } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

// FR/EN only for now - same precedent as every other long-form content
// page added this pass (see guides/[slug]). Not in routing.locales' full
// set to avoid claiming a DE/IT/DA/AR version exists when it doesn't
// (OPEN-QUESTIONS: never use hreflang for a language that has no real
// equivalent page).
const SUPPORTED_LOCALES = ["fr", "en"] as const;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.faq" });
  const languages: Record<string, string> = { "x-default": localeHref("fr", "/faq") };
  for (const l of SUPPORTED_LOCALES) languages[l] = localeHref(l, "/faq");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: localeHref(locale, "/faq"), languages },
  };
}

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"] as const;

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) notFound();

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
