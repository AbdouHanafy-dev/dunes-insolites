import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllExtras } from "@/lib/api";
import { ServiceExtrasList } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Véhicules & transport" };

export default async function ServiceOptionsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = (await getAllExtras(session.accessToken))
    .filter((item) => item.category !== "ACTIVITY" && item.category !== "TOUR_OPTION");

  return <ServiceExtrasList initialItems={items} />;
}
