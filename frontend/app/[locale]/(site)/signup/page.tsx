import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthForm from "@/components/AuthForm";
import AuthLayout from "@/components/AuthLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.signup" });
  return { title: t("title"), description: t("description"), robots: { index: false } };
}

export default async function SignupPage() {
  const t = await getTranslations("signupPage");
  return (
    <AuthLayout eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/camel.jpg">
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
