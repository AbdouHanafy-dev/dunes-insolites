import type { Metadata } from "next";
import ReservationsListPage from "@/components/reservations/ReservationsListPage";

export const metadata: Metadata = { title: "Toutes les réservations" };

export default function ReservationsPage() {
  return <ReservationsListPage kind="all" />;
}
