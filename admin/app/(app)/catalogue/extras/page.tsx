import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllExtras } from "@/lib/api";
import { ExtrasList } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Activités" };

export default async function ExtrasPage() {
  const session = await getSession();
  if (!session) return null;

  const items = (await getAllExtras(session.accessToken))
    .filter((item) => item.category === "ACTIVITY");

  return <ExtrasList initialItems={items} />;
}
