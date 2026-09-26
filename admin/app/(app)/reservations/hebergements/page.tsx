import type { Metadata } from "next";
import ReservationsListPage from "@/components/reservations/ReservationsListPage";

export const metadata: Metadata = { title: "Réservations d’hébergement" };

export default function StayReservationsPage() {
  return <ReservationsListPage kind="stays" />;
}
