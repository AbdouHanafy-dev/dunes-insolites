import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTourTypes } from "@/lib/api";
import PagesEditor from "@/components/pages/PagesEditor";

export const metadata: Metadata = { title: "Nouvelle page" };

export default async function NewPagePage() {
  const session = await getSession();
  if (!session) return null;

  const tourTypes = await getAllTourTypes(session.accessToken);

  return <PagesEditor tourTypes={tourTypes} />;
}
