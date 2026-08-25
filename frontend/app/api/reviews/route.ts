import { reviews } from "@/lib/data/reviews";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activity = searchParams.get("activity");
  const stay = searchParams.get("stay");
  const list = activity
    ? reviews.filter((r) => r.activitySlug === activity)
    : stay
      ? reviews.filter((r) => r.staySlug === stay || (!r.staySlug && !r.activitySlug))
      : reviews;
  return Response.json({ reviews: list });
}
