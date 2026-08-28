import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTourTypeById } from "@/lib/api";
import { HebergementEditor } from "@/components/crud/HebergementsCrud";

export default async function EditHebergementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getTourTypeById(session.accessToken, id);
  if (!item) notFound();

  return <HebergementEditor id={id} initialData={item} />;
}
