import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import { site } from "@/lib/site";
import { localeAlternates, localeHref } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.legalPrivacy" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/legal/privacy")),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");
  const tLegal = await getTranslations("legal");
  const tContact = await getTranslations("contact");

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
