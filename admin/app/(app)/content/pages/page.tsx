import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllPages } from "@/lib/api";
import PagesList from "@/components/pages/PagesList";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesIndexPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllPages(session.accessToken);

  return <PagesList initialItems={items} />;
}
