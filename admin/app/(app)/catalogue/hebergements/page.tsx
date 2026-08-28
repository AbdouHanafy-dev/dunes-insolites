import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTourTypes } from "@/lib/api";
import { HebergementsList } from "@/components/crud/HebergementsCrud";

export const metadata: Metadata = { title: "Hébergements" };

export default async function HebergementsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllTourTypes(session.accessToken);

  return <HebergementsList initialItems={items} />;
}
