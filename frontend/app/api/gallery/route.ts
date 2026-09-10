import { seedRouteDisabled } from "@/lib/seedGuard";
import { fullGallery } from "@/lib/data/gallery";

export async function GET() {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  return Response.json(fullGallery);
}
