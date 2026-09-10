import { seedRouteDisabled } from "@/lib/seedGuard";
import { getBooking } from "@/lib/bookings";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }
  return Response.json(booking);
}
