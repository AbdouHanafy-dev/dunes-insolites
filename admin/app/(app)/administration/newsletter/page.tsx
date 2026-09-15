import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllNewsletterSubscribers } from "@/lib/api";
import { NewsletterList } from "@/components/crud/NewsletterCrud";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllNewsletterSubscribers(session.accessToken);

  return <NewsletterList initialItems={items} />;
}
