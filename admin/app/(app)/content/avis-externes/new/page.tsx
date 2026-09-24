import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllReviewPlatforms } from "@/lib/api";
import { ExternalReviewEditor } from "@/components/crud/ExternalReviewsCrud";

export const metadata: Metadata = { title: "Nouvel avis" };

export default async function NewExternalReviewPage() {
  const session = await getSession();
  if (!session) return null;

  const platforms = await getAllReviewPlatforms(session.accessToken);

  return <ExternalReviewEditor platforms={platforms} />;
}
