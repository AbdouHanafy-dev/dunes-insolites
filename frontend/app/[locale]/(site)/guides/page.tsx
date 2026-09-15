import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import { Link } from "@/i18n/navigation";
import { routing, localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getGuidePages } from "@/lib/api";
import { GUIDE_SLUGS } from "@/lib/guides";

// Now translated into all 6 locales - was FR/EN-only when this page first shipped.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.guides" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/guides")),
  };
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const [t, cmsPages, tNav, ...guideTs] = await Promise.all([
    getTranslations("guidesPage"),
    getGuidePages(locale),
    getTranslations("nav"),
    ...GUIDE_SLUGS.map((g) => getTranslations(g.namespace)),
  ]);

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/guides") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  // Admin-authored articles (any slug, including a brand-new one no
  // frontend code knows about) plus the two seed articles - a CMS page
  // wins over a seed one that happens to share the same slug, same
  // "published content overrides the fallback" rule as every other CMS
  // page on this site.
  const cmsSlugs = new Set(cmsPages.map((p) => p.slug));
  const seedGuides = GUIDE_SLUGS
    .map((guide, i) => ({ slug: guide.slug, title: guideTs[i]("title"), lead: guideTs[i]("lead") }))
    .filter((g) => !cmsSlugs.has(g.slug));
  const allGuides = [
    ...cmsPages.map((p) => ({ slug: p.slug, title: p.title, lead: p.metaDescription ?? "" })),
    ...seedGuides,
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/sandboard.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <Reveal className="prose">
            {allGuides.map((guide) => (
              <div key={guide.slug}>
                <h2>
                  <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
                </h2>
                <p>{guide.lead}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
