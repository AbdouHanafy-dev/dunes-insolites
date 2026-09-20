import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import GalleryGrid from "@/components/GalleryGrid";
import PageHead from "@/components/PageHead";
import CTA from "@/components/CTA";
import { getGallery } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.gallery" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/gallery")),
  };
}

export default async function GalleryPage() {
  const [items, t, tCta, locale, tNav] = await Promise.all([
    getGallery(),
    getTranslations("galleryPage"),
    getTranslations("ctaGallery"),
    getLocale(),
    getTranslations("nav"),
  ]);

  // Filter facets come from the content itself now — "All" plus every
  // distinct tag an editor has used, in first-seen order.
  const tags = ["All", ...new Set(items.map((i) => i.tag).filter((tag) => tag && tag !== "All"))];

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/gallery") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/camel.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <GalleryGrid items={items} tags={tags} />
        </div>
      </section>

      <CTA title={tCta("title")} body={tCta("body")} />
    </>
  );
}
