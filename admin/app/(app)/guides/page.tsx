import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getGuides } from "@/lib/api";

export const metadata: Metadata = { title: "Guides" };

export default async function GuidesPage() {
  const session = await getSession();
  if (!session) return null;

  const guides = await getGuides(session.accessToken, 0, 50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Guides</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            Tous les guides affectés, toutes réservations confondues. Un guide traduit pour le groupe — voir
            les chauffeurs séparément.
          </p>
        </div>
        <span className="rounded-full bg-navy-700/8 px-3 py-1.5 text-sm font-semibold text-navy-800">
          {guides.totalElements} résultat{guides.totalElements === 1 ? "" : "s"}
        </span>
      </div>

      <div className="card rounded-2xl">
        {guides.content.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun guide affecté pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Guide</th>
                  <th className="px-6 py-3 font-medium">Téléphone</th>
                  <th className="px-6 py-3 font-medium">Langues</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guides.content.map((g) => (
                  <tr key={g.guideId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {g.firstName} {g.lastName}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{g.phoneNumber ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {(g.languages ?? []).length > 0
                        ? g.languages!.map((l) => l.name).join(", ")
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      <Link href={`/reservations/${g.reservationId}`} className="hover:underline">
                        {g.clientName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{g.tourDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
