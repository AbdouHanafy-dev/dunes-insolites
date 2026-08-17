import { reviews } from "@/lib/data/reviews";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activity = searchParams.get("activity");
  const list = activity ? reviews.filter((r) => r.activitySlug === activity) : reviews;
  return Response.json({ reviews: list });
}
