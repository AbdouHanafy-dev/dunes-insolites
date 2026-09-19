import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getSpokenLanguages } from "@/lib/api";
import LanguagesManager from "@/components/payload/LanguagesManager";

export const metadata: Metadata = { title: "Langues" };

export default async function LanguagesPage() {
  const session = await getSession();
  if (!session) return null;

  const languages = await getSpokenLanguages(session.accessToken);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Langues</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          La liste des langues disponibles pour affecter un guide et pour la langue préférée d&apos;un
          client — pas une liste figée : ajoutez-en autant que nécessaire (allemand, italien, espagnol…).
          Désactiver une langue la retire des nouveaux choix sans toucher aux affectations existantes.
        </p>
      </div>

      <LanguagesManager initialLanguages={languages} />
    </div>
  );
}
