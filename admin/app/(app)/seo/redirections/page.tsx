import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllRedirects } from "@/lib/api";
import { RedirectsList } from "@/components/crud/RedirectsCrud";

export const metadata: Metadata = { title: "Redirections" };

export default async function RedirectionsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllRedirects(session.accessToken);

  return <RedirectsList initialItems={items} />;
}
