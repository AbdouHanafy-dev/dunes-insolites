import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTours } from "@/lib/api";
import { ToursList } from "@/components/crud/ToursCrud";

export const metadata: Metadata = { title: "Circuits" };

export default async function ToursPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllTours(session.accessToken);

  return <ToursList initialItems={items} />;
}
