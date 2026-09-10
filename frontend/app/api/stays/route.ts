import { seedRouteDisabled } from "@/lib/seedGuard";
import { getStays } from "@/lib/data/stays";

export async function GET() {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  return Response.json({ stays: getStays() });
}
