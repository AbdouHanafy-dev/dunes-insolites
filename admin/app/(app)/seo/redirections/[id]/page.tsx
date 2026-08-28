import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRedirectById } from "@/lib/api";
import { RedirectEditor } from "@/components/crud/RedirectsCrud";

export default async function EditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getRedirectById(session.accessToken, id);
  if (!item) notFound();

  return <RedirectEditor id={id} initialData={item} />;
}
