import type { Metadata } from "next";
import ReservationsListPage from "@/components/reservations/ReservationsListPage";

export const metadata: Metadata = { title: "Réservations de circuits" };

export default function CircuitReservationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <ReservationsListPage kind="circuits" searchParams={searchParams} />;
}
