import Link from "next/link";
import { getSession } from "@/lib/session";
import { getActiveReservations } from "@/lib/api";
import { ofKind, type ReservationKind } from "@/lib/reservationKind";
import ReservationsTable from "@/components/reservations/ReservationsTable";

const COPY: Record<ReservationKind, { title: string; description: string }> = {
  all: { title: "Toutes les réservations", description: "Réservations actives : hébergements et circuits, toutes marques confondues." },
  stays: { title: "Réservations d’hébergement", description: "Nuitées au camp (tente, chambre, suite, bivouac)." },
  circuits: { title: "Réservations de circuits", description: "Circuits de plusieurs jours au départ de Djerba, Tunis et ailleurs." },
};

/** One reservations list, filtered to a kind. The three sidebar entries share this page. */
export default async function ReservationsListPage({
  kind,
  searchParams,
}: {
  kind: ReservationKind;
  searchParams?: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const initialQuery = (await searchParams)?.q ?? "";

  // Search and sort run client-side, so load enough rows to cover the list.
  const loaded = await getActiveReservations(session.accessToken, 0, 500);
  const reservations = ofKind(loaded.content, kind);
  const copy = COPY[kind];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">{copy.title}</h1>
          <p className="mt-1 text-sm text-navy-700/55">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-navy-700/8 px-3 py-1.5 text-sm font-semibold text-navy-800">
            {reservations.length} résultat{reservations.length === 1 ? "" : "s"}
          </span>
          <Link href="/reservations/new" className="btn btn-primary">
            + Nouvelle réservation
          </Link>
        </div>
      </div>

      <ReservationsTable
        reservations={reservations}
        canDelete={session.role === "ADMIN"}
        variant={kind === "stays" ? "stays" : "all"}
        initialQuery={initialQuery}
      />
    </div>
  );
}
