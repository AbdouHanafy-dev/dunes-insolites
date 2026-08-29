import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthLayout from "@/components/AuthLayout";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forgotPasswordPage" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPasswordPage");
  return (
    <AuthLayout eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/gate.jpg">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
