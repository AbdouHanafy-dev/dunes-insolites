import { getActivities } from "@/lib/data/activities";

export async function GET() {
  return Response.json({ activities: getActivities() });
}
