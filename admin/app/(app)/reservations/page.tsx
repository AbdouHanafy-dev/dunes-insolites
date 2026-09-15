import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveReservations } from "@/lib/api";

export const metadata: Metadata = { title: "Réservations" };

export default async function ReservationsPage() {
  const session = await getSession();
  if (!session) return null;

  const reservations = await getActiveReservations(session.accessToken, 0, 50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Réservations</h1>
          <p className="mt-1 text-sm text-navy-700/55">Réservations actives, toutes marques confondues.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-navy-700/8 px-3 py-1.5 text-sm font-semibold text-navy-800">
            {reservations.totalElements} résultat{reservations.totalElements === 1 ? "" : "s"}
          </span>
          <Link href="/reservations/new" className="btn btn-primary">
            + Nouvelle réservation
          </Link>
        </div>
      </div>

      <div className="card rounded-2xl">
        {reservations.content.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucune réservation active.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Prestation</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Créée le</th>
                  <th className="px-6 py-3 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.content.map((r) => (
                  <tr key={r.reservationId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{r.userName}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {[...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] capitalize text-gray-700">
                        {r.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {r.checkInDate ?? r.serviceDate ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {r.totalAmount} {r.currency}
                    </td>
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
