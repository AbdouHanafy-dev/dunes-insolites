import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllExtras } from "@/lib/api";
import { ExtrasList } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Extras" };

export default async function ExtrasPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllExtras(session.accessToken);

  return <ExtrasList initialItems={items} />;
}
