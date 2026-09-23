import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveReservations } from "@/lib/api";
import ReservationsTable from "@/components/reservations/ReservationsTable";

export const metadata: Metadata = { title: "Réservations" };

export default async function ReservationsPage() {
  const session = await getSession();
  if (!session) return null;

  // Search and sort run client-side, so load enough rows to cover the list.
  const reservations = await getActiveReservations(session.accessToken, 0, 200);

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

      <ReservationsTable reservations={reservations.content} canDelete={session.role === "ADMIN"} />
    </div>
  );
}
