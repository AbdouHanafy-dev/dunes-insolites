import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import { Link } from "@/i18n/navigation";
import { localeHref } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import { GUIDE_SLUGS } from "@/lib/guides";

// FR/EN only for now - see guides/[slug]/page.tsx's own comment.
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
  const t = await getTranslations({ locale, namespace: "meta.guides" });
  const languages: Record<string, string> = { "x-default": localeHref("fr", "/guides") };
  for (const l of SUPPORTED_LOCALES) languages[l] = localeHref(l, "/guides");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: localeHref(locale, "/guides"), languages },
  };
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) notFound();

  const [t, ...guideTs] = await Promise.all([
    getTranslations("guidesPage"),
    ...GUIDE_SLUGS.map((g) => getTranslations(g.namespace)),
  ]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/guides") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/sandboard.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <Reveal className="prose">
            {GUIDE_SLUGS.map((guide, i) => (
              <div key={guide.slug}>
                <h2>
                  <Link href={`/guides/${guide.slug}`}>{guideTs[i]("title")}</Link>
                </h2>
                <p>{guideTs[i]("lead")}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
