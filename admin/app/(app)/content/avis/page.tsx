import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllReviews } from "@/lib/api";
import { ReviewsList } from "@/components/crud/ReviewsCrud";

export const metadata: Metadata = { title: "Avis clients" };

export default async function ReviewsPage() {
  const session = await getSession();
  if (!session) return null;

  const reviews = await getAllReviews(session.accessToken);

  return <ReviewsList initialItems={reviews} />;
}
