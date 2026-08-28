import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import CmsBlocks from "@/components/CmsBlocks";
import LivePreview from "@/components/LivePreview";
import { site } from "@/lib/site";
import { getCmsPage } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";

const CMS_SLUG = "legal-terms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.legalTerms" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/legal/terms")),
  };
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ livePreview?: string }>;
}) {
  const { livePreview } = await searchParams;
  const tLegal = await getTranslations("legal");

  if (livePreview === "1") {
    return <LivePreview eyebrow={tLegal("eyebrow")} />;
  }

  const locale = await getLocale();
  const [t, cms] = await Promise.all([
    getTranslations("legal.terms"),
    getCmsPage(CMS_SLUG, locale),
  ]);

  // A published "legal-terms" page in the admin CMS takes over this route
  // entirely; with none published (the default), this renders exactly the
  // hardcoded content below, unchanged. See ARCHITECTURE.md §10.6.
  if (cms && cms.blocks.length > 0) {
    return (
      <>
        <PageHead eyebrow={tLegal("eyebrow")} title={cms.title} lead="" />
        <CmsBlocks blocks={cms.blocks} />
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow={tLegal("eyebrow")} title={t("title")} lead={t("updated")} />

      <section className="section-sand">
        <div className="wrap">
          <div className="prose">
            <h2>{t("bookingHeading")}</h2>
            <p>{t("bookingP")}</p>

            <h2>{t("paymentHeading")}</h2>
            <p>{t("paymentP")}</p>

            <h2>{t("cancelHeading")}</h2>
            <ul>
              <li>{t("cancel1")}</li>
              <li>{t("cancel2")}</li>
              <li>{t("cancel3")}</li>
              <li>{t("cancel4")}</li>
            </ul>

            <h2>{t("participationHeading")}</h2>
            <p>{t("participationP1")}</p>
            <p>{t("participationP2")}</p>

            <h2>{t("riskHeading")}</h2>
            <p>{t("riskP")}</p>

            <h2>{t("liabilityHeading")}</h2>
            <p>{t("liabilityP")}</p>

            <h2>{t("photographyHeading")}</h2>
            <p>{t("photographyP")}</p>

            <h2>{t("lawHeading")}</h2>
            <p>
              {t("lawPre")}
              <a href={`mailto:${site.email}`}>{site.email}</a>
              {t("lawPost")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
