import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTourTypes, getAllExtras, getAllSources, getAllTours } from "@/lib/api";
import NewReservationForm from "@/components/reservations/NewReservationForm";

export const metadata: Metadata = { title: "Nouvelle réservation" };

export default async function NewReservationPage() {
  const session = await getSession();
  if (!session) return null;

  const [tourTypes, extras, sources, tours] = await Promise.all([
    getAllTourTypes(session.accessToken),
    getAllExtras(session.accessToken),
    getAllSources(session.accessToken),
    getAllTours(session.accessToken),
  ]);

  // TourType is Dunes Insolites' nuitée-campement/nuitee-bivouac product.
  // Tour is Route Insolite's multi-day circuit product — CLAUDE.md forbids
  // it on the public Dunes vitrine, but this is the internal admin booking
  // form (phone/agency bookings), not the vitrine: Route Insolite doesn't
  // have its own backoffice yet (R4, unscheduled), so staff book its real
  // circuits here in the meantime — see docs/SPACES-AND-WORKFLOW.md §6.
  const activeTourTypes = tourTypes.filter((t) => t.isActive);
  const activeExtras = extras.filter((e) => e.isActive);
  const activeTours = tours.filter((t) => t.isActive);

  return (
    <NewReservationForm
      tourTypes={activeTourTypes}
      extras={activeExtras}
      sources={sources}
      tours={activeTours}
    />
  );
}
