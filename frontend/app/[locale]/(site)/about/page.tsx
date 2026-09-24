import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import AboutView from "@/components/AboutView";
import Experience from "@/components/Experience";
import CTA from "@/components/CTA";
import CmsBlocks from "@/components/CmsBlocks";
import LivePreview from "@/components/LivePreview";
import { getCmsPage } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

const CMS_SLUG = "about";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.about" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/about")),
  };
}

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ livePreview?: string }>;
}) {
  const { livePreview } = await searchParams;

  if (livePreview === "1") {
    const t = await getTranslations("about");
    return <LivePreview eyebrow={t("eyebrow")} />;
  }

  const locale = await getLocale();
  const [t, cms, tNav] = await Promise.all([
    getTranslations("about"),
    getCmsPage(CMS_SLUG, locale),
    getTranslations("nav"),
  ]);

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/about") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  // A published "about" page in the admin CMS (a "team" block covers the
  // guide profiles below via a repeatable group field) takes over the
  // editorial content; Experience/CTA stay code — they're conversion
  // components, not page content. See ARCHITECTURE.md §10.6.
  if (cms && cms.blocks.length > 0) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <PageHead eyebrow={t("eyebrow")} title={cms.title} lead="" image="/images/gate.jpg" />
        <CmsBlocks blocks={cms.blocks} />
        <Experience />
        <CTA />
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <AboutView />
    </>
  );
}
