import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getDashboardStats, getActiveReservations } from "@/lib/api";
import StatCard from "@/components/StatCard";
import ReservationsTable from "@/components/reservations/ReservationsTable";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null; // layout already redirects

  const [stats, reservations] = await Promise.all([
    getDashboardStats(session.accessToken),
    getActiveReservations(session.accessToken, 0, 10),
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

      <ReservationsTable
        title="Réservations récentes"
        reservations={reservations.content}
        canDelete={session.role === "ADMIN"}
        limit={10}
      />
    </div>
  );
}
