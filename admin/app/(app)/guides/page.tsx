import type { Metadata } from "next";
import GuideDirectory from "@/components/GuideDirectory";
import { getSession } from "@/lib/session";
import { getGuideProfiles, getSpokenLanguages } from "@/lib/api";

export const metadata: Metadata = { title: "Guides" };

export default async function GuidesPage() {
  const session = await getSession();
  if (!session) return null;
  const [guides, languages] = await Promise.all([
    getGuideProfiles(session.accessToken),
    getSpokenLanguages(session.accessToken),
  ]);

  const activeCount = guides.filter((guide) => guide.active).length;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Annuaire des guides</h1>
          <p className="mt-1 text-sm text-navy-700/55">Profils permanents réutilisables pour toutes les réservations.</p>
        </div>
        <span className="rounded-full bg-navy-700/8 px-3 py-1.5 text-sm font-semibold text-navy-800">
          {activeCount} actif{activeCount === 1 ? "" : "s"}
        </span>
      </div>
      <GuideDirectory initialGuides={guides} languages={languages} />
    </div>
  );
}
