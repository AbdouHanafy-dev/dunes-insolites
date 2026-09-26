import type { Metadata } from "next";
import ReservationsListPage from "@/components/reservations/ReservationsListPage";

export const metadata: Metadata = { title: "Réservations de circuits" };

export default function CircuitReservationsPage() {
  return <ReservationsListPage kind="circuits" />;
}
