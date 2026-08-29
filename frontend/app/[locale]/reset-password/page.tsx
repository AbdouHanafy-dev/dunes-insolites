import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthLayout from "@/components/AuthLayout";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resetPasswordPage" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("resetPasswordPage");
  return (
    <AuthLayout eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/gate.jpg">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
