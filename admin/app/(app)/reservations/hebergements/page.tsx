import type { Metadata } from "next";
import ReservationsListPage from "@/components/reservations/ReservationsListPage";

export const metadata: Metadata = { title: "Réservations d’hébergement" };

export default function StayReservationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <ReservationsListPage kind="stays" searchParams={searchParams} />;
}
