import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTourTypes } from "@/lib/api";
import AvailabilityCalendar from "@/components/availability/AvailabilityCalendar";

export const metadata: Metadata = { title: "Disponibilités" };

export default async function DisponibilitesPage() {
  const session = await getSession();
  if (!session) return null;

  const tourTypes = await getAllTourTypes(session.accessToken);

  return <AvailabilityCalendar tourTypes={tourTypes} />;
}
