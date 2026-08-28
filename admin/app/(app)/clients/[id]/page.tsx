import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/api";
import { ClientEditor } from "@/components/crud/ClientsCrud";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getUserById(session.accessToken, id);
  if (!item) notFound();

  return <ClientEditor id={id} initialData={item} />;
}
