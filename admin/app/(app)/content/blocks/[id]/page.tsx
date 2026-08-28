import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getContentBlockById, getAllTourTypes } from "@/lib/api";
import { ContentBlockEditor } from "@/components/crud/ContentBlocksCrud";

export default async function EditContentBlockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const [item, tourTypes] = await Promise.all([
    getContentBlockById(session.accessToken, id),
    getAllTourTypes(session.accessToken),
  ]);
  if (!item) notFound();

  return <ContentBlockEditor id={id} initialData={item} tourTypes={tourTypes} />;
}
