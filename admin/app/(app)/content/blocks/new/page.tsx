import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTourTypes } from "@/lib/api";
import { ContentBlockEditor } from "@/components/crud/ContentBlocksCrud";

export const metadata: Metadata = { title: "Nouveau bloc de contenu" };

export default async function NewContentBlockPage() {
  const session = await getSession();
  if (!session) return null;

  const tourTypes = await getAllTourTypes(session.accessToken);

  return <ContentBlockEditor tourTypes={tourTypes} />;
}
