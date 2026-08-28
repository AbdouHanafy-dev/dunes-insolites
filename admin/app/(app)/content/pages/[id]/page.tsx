import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPageById, getAllTourTypes } from "@/lib/api";
import PagesEditor from "@/components/pages/PagesEditor";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const [item, tourTypes] = await Promise.all([
    getPageById(session.accessToken, id),
    getAllTourTypes(session.accessToken),
  ]);
  if (!item) notFound();

  return <PagesEditor id={id} initialData={item} tourTypes={tourTypes} />;
}
