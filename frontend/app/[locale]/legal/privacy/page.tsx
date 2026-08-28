import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import CmsBlocks from "@/components/CmsBlocks";
import { site } from "@/lib/site";
import { getCmsPage } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";

const CMS_SLUG = "legal-privacy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.legalPrivacy" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  // A published CMS page's own SEO fields win when the editor filled them
  // in; otherwise this falls back to the translated defaults exactly as
  // before CMS wiring existed.
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/legal/privacy")),
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const [t, tLegal, tContact, cms] = await Promise.all([
    getTranslations("legal.privacy"),
    getTranslations("legal"),
    getTranslations("contact"),
    getCmsPage(CMS_SLUG, locale),
  ]);

  // A published "legal-privacy" page in the admin CMS takes over this
  // route entirely; with none published (the default — nothing has been
  // authored there yet), this renders exactly the hardcoded content below,
  // unchanged. See admin/ARCHITECTURE.md §10.5 and frontend/CLAUDE.md.
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
            <h2>{t("collectHeading")}</h2>
            <p>{t("collectP1")}</p>
            <p>{t("collectP2")}</p>

            <h2>{t("whyHeading")}</h2>
            <ul>
              <li>{t("why1")}</li>
              <li>{t("why2")}</li>
              <li>{t("why3")}</li>
              <li>{t("why4")}</li>
            </ul>

            <h2>{t("whoHeading")}</h2>
            <p>{t("whoP")}</p>

            <h2>{t("keepHeading")}</h2>
            <p>{t("keepP")}</p>

            <h2>{t("rightsHeading")}</h2>
            <p>
              {t("rightsPre")}
              <a href={`mailto:${site.email}`}>{site.email}</a>
              {t("rightsPost")}
            </p>

            <h2>{t("cookiesHeading")}</h2>
            <p>{t("cookiesP")}</p>

            <h2>{t("contactHeading")}</h2>
            <p>
              {site.legalName}, {site.address}. {tContact("emailLabel")}{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>, {tContact("phoneLabel")} {site.phone}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
