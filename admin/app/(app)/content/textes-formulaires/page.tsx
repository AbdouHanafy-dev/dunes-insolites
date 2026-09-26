import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getSiteTextCatalogue, getSiteTextOverrides } from "@/lib/api";
import SiteTextsEditor from "@/components/content/SiteTextsEditor";

export const metadata: Metadata = { title: "Textes des formulaires" };

export default async function SiteTextsPage() {
  const session = await getSession();
  if (!session) return null;

  const [catalogue, overrides] = await Promise.all([getSiteTextCatalogue(), getSiteTextOverrides(session.accessToken)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Textes des formulaires de réservation</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Titres, phrases et libellés du formulaire circuit, du formulaire hébergement et du menu des devises, dans les six langues.
          Une case vide garde le texte d’origine. Les changements apparaissent sur le site en quelques minutes.
        </p>
      </div>
      {catalogue ? (
        <SiteTextsEditor catalogue={catalogue} initialOverrides={overrides} />
      ) : (
        <div className="card rounded-2xl p-5 text-sm text-navy-700/70">
          Impossible de lire la liste des textes — vérifiez que le site public tourne (NEXT_PUBLIC_FRONTEND_URL).
        </div>
      )}
    </div>
  );
}
