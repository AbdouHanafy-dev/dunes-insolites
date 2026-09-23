import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getDashboardStats, getActiveReservations } from "@/lib/api";
import StatCard from "@/components/StatCard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null; // layout already redirects

  const [stats, reservations] = await Promise.all([
    getDashboardStats(session.accessToken),
    getActiveReservations(session.accessToken, 0, 5),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Tableau de bord</h1>
        <p className="mt-1 text-sm text-navy-700/55">Vue d&apos;ensemble de l&apos;activité.</p>
      </div>

      {!stats ? (
        <div className="card rounded-2xl p-6 text-sm text-gray-500">
          Statistiques indisponibles — vérifiez que le backend est accessible.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenu total"
            value={`${(stats.totalRevenue ?? 0).toLocaleString("fr-FR")} €`}
            growth={stats.revenueGrowth}
            accent="gold"
          />
          <StatCard
            label="Réservations"
            value={String(stats.totalReservations ?? 0)}
            growth={stats.reservationGrowth}
            accent="navy"
          />
          <StatCard
            label="En attente"
            value={String(stats.pendingReservations ?? 0)}
            accent="rose"
          />
          <StatCard
            label="Clients directs"
            value={String(stats.passengerDirectCount ?? 0)}
            accent="emerald"
          />
        </div>
      )}

      <div className="card rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Réservations récentes</h2>
          <span className="rounded-full bg-navy-700/10 px-2.5 py-1 text-[11px] font-bold text-navy-700">
            {reservations.totalElements}
          </span>
        </div>

        {reservations.content.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">Aucune réservation active.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.content.map((r) => (
                  <tr key={r.reservationId}>
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
