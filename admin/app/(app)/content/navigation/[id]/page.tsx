import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNavigationItemById } from "@/lib/api";
import { NavigationEditor } from "@/components/crud/NavigationCrud";

export default async function EditNavigationItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getNavigationItemById(session.accessToken, id);
  if (!item) notFound();

  return <NavigationEditor id={id} initialData={item} />;
}
