import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTourTypes, getAllExtras, getAllSources } from "@/lib/api";
import NewReservationForm from "@/components/reservations/NewReservationForm";

export const metadata: Metadata = { title: "Nouvelle réservation" };

export default async function NewReservationPage() {
  const session = await getSession();
  if (!session) return null;

  const [tourTypes, extras, sources] = await Promise.all([
    getAllTourTypes(session.accessToken),
    getAllExtras(session.accessToken),
    getAllSources(session.accessToken),
  ]);

  // TourType has no companyType field (unlike Tour) - every entry here is
  // already Dunes Insolites' nuitée-campement/nuitee-bivouac, never Route
  // Insolite's product (that's the separate Tour entity, deliberately not
  // offered on this form - see CLAUDE.md's "do not add multi-day touring
  // to the Dunes vitrine" rule, which applies just as much to the admin's
  // own booking form as to the public site).
  const activeTourTypes = tourTypes.filter((t) => t.isActive);
  const activeExtras = extras.filter((e) => e.isActive);

  return (
    <NewReservationForm tourTypes={activeTourTypes} extras={activeExtras} sources={sources} />
  );
}
