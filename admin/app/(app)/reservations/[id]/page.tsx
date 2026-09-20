import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDriverProfiles, getReservationById, getSpokenLanguages } from "@/lib/api";
import ReservationStaffPanel from "@/components/payload/ReservationStaffPanel";

export const metadata: Metadata = { title: "Réservation" };

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const [reservation, languages, driverProfiles] = await Promise.all([
    getReservationById(session.accessToken, id),
    getSpokenLanguages(session.accessToken),
    getDriverProfiles(session.accessToken),
  ]);
  if (!reservation) notFound();

  const line = [...reservation.tourTypes, ...reservation.tours][0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/reservations" className="text-sm text-navy-700/50 hover:underline">
          ← Réservations
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">{reservation.userName}</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          {line?.name ?? reservation.reservationType} · {reservation.checkInDate ?? reservation.serviceDate ?? "—"}
        </p>
      </div>

      <div className="card grid grid-cols-2 gap-4 rounded-2xl p-5 sm:grid-cols-4">
        <Field label="Statut" value={reservation.status} />
        <Field label="Type" value={reservation.reservationType} />
        <Field label="Adultes / Enfants" value={`${reservation.numberOfAdults ?? 0} / ${reservation.numberOfChildren ?? 0}`} />
        <Field label="Montant" value={`${reservation.totalAmount} ${reservation.currency}`} />
        {reservation.arrivalMode && (
          <Field
            label="Transport client"
            value={reservation.arrivalMode === "TRANSPORT" ? "Véhicule et chauffeur demandés" : "Le client vient avec son véhicule"}
          />
        )}
        {reservation.groupName && <Field label="Groupe" value={reservation.groupName} />}
        {reservation.groupLeaderName && <Field label="Responsable groupe" value={reservation.groupLeaderName} />}
        {reservation.preferredLanguages.length > 0 && (
          <Field label="Langue(s) préférée(s) du client" value={reservation.preferredLanguages.map((l) => l.name).join(", ")} />
        )}
        {reservation.otherLanguageRequested && (
          <Field label="Autre langue demandée" value={reservation.otherLanguageRequested} />
        )}
      </div>

      <ReservationStaffPanel
        reservationId={reservation.reservationId}
        reservationType={reservation.reservationType}
        status={reservation.status}
        arrivalMode={reservation.arrivalMode}
        preferredLanguages={reservation.preferredLanguages}
        allLanguages={languages}
        initialGuides={reservation.guides ?? []}
        initialChauffeurs={reservation.chauffeurs ?? []}
        driverProfiles={driverProfiles}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
