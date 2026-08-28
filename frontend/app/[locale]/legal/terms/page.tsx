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
  const t = await getTranslations({ locale, namespace: "meta.legalTerms" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/legal/terms")),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const tLegal = await getTranslations("legal");

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
