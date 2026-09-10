import { seedRouteDisabled } from "@/lib/seedGuard";
import { getActivities } from "@/lib/data/activities";

export async function GET() {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  return Response.json({ activities: getActivities() });
}
