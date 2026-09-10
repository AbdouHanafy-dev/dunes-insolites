import { seedRouteDisabled } from "@/lib/seedGuard";
import { stats } from "@/lib/data/stats";

export async function GET() {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  return Response.json(stats);
}
