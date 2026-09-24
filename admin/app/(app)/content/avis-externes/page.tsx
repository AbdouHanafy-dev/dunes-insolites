import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllExternalReviews, getAllReviewPlatforms } from "@/lib/api";
import { ExternalReviewsList } from "@/components/crud/ExternalReviewsCrud";
import ReviewPlatformsManager from "@/components/crud/ReviewPlatformsManager";

export const metadata: Metadata = { title: "Avis Google & autres plateformes" };

export default async function ExternalReviewsPage() {
  const session = await getSession();
  if (!session) return null;

  const [items, platforms] = await Promise.all([
    getAllExternalReviews(session.accessToken),
    getAllReviewPlatforms(session.accessToken),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <ExternalReviewsList initialItems={items} />
      <ReviewPlatformsManager platforms={platforms} />
    </div>
  );
}
