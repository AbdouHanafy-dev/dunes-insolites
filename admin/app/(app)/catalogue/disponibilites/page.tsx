import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllExtras, getAllTourTypes } from "@/lib/api";
import AvailabilityWorkspace from "@/components/availability/AvailabilityWorkspace";

export const metadata: Metadata = { title: "Disponibilités" };

export default async function DisponibilitesPage() {
  const session = await getSession();
  if (!session) return null;

  const [tourTypes, extras] = await Promise.all([
    getAllTourTypes(session.accessToken),
    getAllExtras(session.accessToken),
  ]);

  return <AvailabilityWorkspace tourTypes={tourTypes} activities={extras.filter((extra) => extra.category === "ACTIVITY")} />;
}
