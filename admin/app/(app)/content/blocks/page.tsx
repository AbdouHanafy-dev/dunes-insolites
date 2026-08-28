import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllContentBlocks } from "@/lib/api";
import { ContentBlocksList } from "@/components/crud/ContentBlocksCrud";

export const metadata: Metadata = { title: "Blocs de contenu" };

export default async function ContentBlocksPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllContentBlocks(session.accessToken);

  return <ContentBlocksList initialItems={items} />;
}
