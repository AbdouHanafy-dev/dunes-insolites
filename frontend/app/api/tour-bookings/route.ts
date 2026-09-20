import { proxyPublicBooking } from "@/lib/publicBookingProxy";
import { seedRouteDisabled } from "@/lib/seedGuard";

export async function POST(req: Request) {
  const proxied = await proxyPublicBooking(req, "/public/tour-bookings");
  if (proxied) return proxied;
  return seedRouteDisabled()
    ?? Response.json({ error: "Tour booking requires the backend." }, { status: 501 });
}
