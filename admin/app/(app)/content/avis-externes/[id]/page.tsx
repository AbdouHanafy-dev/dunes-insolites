import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllReviewPlatforms, getExternalReviewById } from "@/lib/api";
import { ExternalReviewEditor } from "@/components/crud/ExternalReviewsCrud";

export default async function EditExternalReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const [item, platforms] = await Promise.all([
    getExternalReviewById(session.accessToken, id),
    getAllReviewPlatforms(session.accessToken),
  ]);
  if (!item) notFound();

  return <ExternalReviewEditor id={id} initialData={item} platforms={platforms} />;
}
