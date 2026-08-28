import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCampingSettings } from "@/lib/api";
import SettingsForm from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const settings = await getCampingSettings(session.accessToken);

  return <SettingsForm initialData={settings} />;
}
