import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCampingSettings, getPaymentPolicy, getSiteSettings } from "@/lib/api";
import SettingsForm from "@/components/settings/SettingsForm";
import SiteSettingsForm from "@/components/settings/SiteSettingsForm";
import PaymentPolicyForm from "@/components/settings/PaymentPolicyForm";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const [campingSettings, siteSettings, paymentPolicy] = await Promise.all([
    getCampingSettings(session.accessToken),
    getSiteSettings(session.accessToken),
    getPaymentPolicy(session.accessToken),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <SettingsForm initialData={campingSettings} />
      <PaymentPolicyForm initialData={paymentPolicy} />
      <SiteSettingsForm initialData={siteSettings} />
    </div>
  );
}
