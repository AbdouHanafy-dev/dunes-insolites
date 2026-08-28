import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getExtraById } from "@/lib/api";
import { ExtraEditor } from "@/components/crud/ExtrasCrud";

export default async function EditExtraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getExtraById(session.accessToken, id);
  if (!item) notFound();

  return <ExtraEditor id={id} initialData={item} />;
}
