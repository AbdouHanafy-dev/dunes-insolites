import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTourById } from "@/lib/api";
import { TourEditor } from "@/components/crud/ToursCrud";

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getTourById(session.accessToken, id);
  if (!item) notFound();

  return <TourEditor id={id} initialData={item} />;
}
