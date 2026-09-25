import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import ContactView from "@/components/ContactView";
import LivePreview from "@/components/LivePreview";
import { getCmsPage } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

const CMS_SLUG = "contact";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.contact" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/contact")),
  };
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ livePreview?: string }>;
}) {
  const { livePreview } = await searchParams;

  if (livePreview === "1") {
    const t = await getTranslations("contact");
    return <LivePreview eyebrow={t("eyebrow")} />;
  }

  const locale = await getLocale();
  const [t, cms, tNav] = await Promise.all([
    getTranslations("contact"),
    getCmsPage(CMS_SLUG, locale),
    getTranslations("nav"),
  ]);

  // Only the header reads from the CMS here — the form, info cards and map
  // are real functionality, not editorial content, and were never going to
  // become CMS blocks (see ARCHITECTURE.md §10.6). A published "contact"
  // page's hero block can override the title/lead; its eyebrow always comes
  // from the translated default, since "hero" has no eyebrow field. With
  // no CMS page published (true today), this is byte-for-byte what it was
  // before this section existed.
  const heroBlock = cms?.blocks.find((b) => b.type === "hero");
  const heroData = heroBlock?.data ?? {};
  const title = typeof heroData.title === "string" && heroData.title ? heroData.title : undefined;
  const lead = typeof heroData.subtitle === "string" && heroData.subtitle ? heroData.subtitle : undefined;

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/contact") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ContactView title={title} lead={lead} />
    </>
  );
}
