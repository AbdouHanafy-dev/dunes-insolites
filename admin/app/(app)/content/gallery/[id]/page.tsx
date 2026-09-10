import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getGalleryImageById } from "@/lib/api";
import { GalleryEditor } from "@/components/crud/GalleryCrud";

export default async function EditGalleryImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getGalleryImageById(session.accessToken, id);
  if (!item) notFound();

  return <GalleryEditor id={id} initialData={item} />;
}
