import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllExtras } from "@/lib/api";
import { TourOptionsList } from "@/components/crud/TourOptionsCrud";

export const metadata: Metadata = { title: "Améliorations de circuit" };

export default async function TourOptionsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = (await getAllExtras(session.accessToken))
    .filter((item) => item.category === "TOUR_OPTION")
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm text-navy-700/65">
        Les améliorations proposées à l&apos;étape « Amélioration » du formulaire de réservation d&apos;un circuit
        (tente individuelle, suite…), et le supplément « Autre ville de retour ». Ajoutez-en, changez un titre ou un prix,
        ou masquez-en une : c&apos;est ici. Elles ne s&apos;affichent que sur les circuits d&apos;au moins une nuit.
      </p>
      <TourOptionsList initialItems={items} />
    </div>
  );
}
