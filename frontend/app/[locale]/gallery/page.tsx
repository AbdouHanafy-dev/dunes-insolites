import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import GalleryGrid from "@/components/GalleryGrid";
import PageHead from "@/components/PageHead";
import CTA from "@/components/CTA";
import { getGallery } from "@/lib/api";
import { galleryTags } from "@/lib/data/gallery";
import { localeAlternates, localeHref } from "@/i18n/routing";

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
  const [items, t, tCta] = await Promise.all([
    getGallery(),
    getTranslations("galleryPage"),
    getTranslations("ctaGallery"),
  ]);

  return (
    <>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/camel.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <GalleryGrid items={items} tags={galleryTags} />
        </div>
      </section>

      <CTA title={tCta("title")} body={tCta("body")} />
    </>
  );
}
