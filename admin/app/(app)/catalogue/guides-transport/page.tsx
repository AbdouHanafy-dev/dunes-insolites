import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllServiceOptions } from "@/lib/api";
import { ServiceOptionsList } from "@/components/crud/ServiceOptionsCrud";

export const metadata: Metadata = { title: "Guides & transport" };

export default async function ServiceOptionsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllServiceOptions(session.accessToken);

  return <ServiceOptionsList initialItems={items} />;
}
