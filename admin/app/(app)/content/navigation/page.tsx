import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllNavigationItems } from "@/lib/api";
import { NavigationList } from "@/components/crud/NavigationCrud";

export const metadata: Metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllNavigationItems(session.accessToken);

  return <NavigationList initialItems={items} />;
}
