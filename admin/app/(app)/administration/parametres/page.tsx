import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCampingSettings, getSiteSettings } from "@/lib/api";
import SettingsForm from "@/components/settings/SettingsForm";
import SiteSettingsForm from "@/components/settings/SiteSettingsForm";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const [campingSettings, siteSettings] = await Promise.all([
    getCampingSettings(session.accessToken),
    getSiteSettings(session.accessToken),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <SettingsForm initialData={campingSettings} />
      <SiteSettingsForm initialData={siteSettings} />
    </div>
  );
}
