import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { searchUsers } from "@/lib/api";
import { ClientsList } from "@/components/crud/ClientsCrud";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await getSession();
  if (!session) return null;

  const result = await searchUsers(session.accessToken, { size: 100 });

  return <ClientsList initialItems={result.content} />;
}
