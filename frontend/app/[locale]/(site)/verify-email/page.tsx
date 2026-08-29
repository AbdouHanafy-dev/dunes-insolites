import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import VerifyEmailStatus from "@/components/VerifyEmailStatus";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verifyEmailPage" });
  return { title: t("title"), robots: { index: false } };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("verifyEmailPage");
  return (
    <section className="notfound">
      <div className="wrap">
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          {t("eyebrow")}
        </p>
        <h1 className="auth-title">{t("title")}</h1>
        <VerifyEmailStatus token={token} />
      </div>
    </section>
  );
}
