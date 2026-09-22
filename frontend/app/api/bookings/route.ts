import { seedRouteDisabled } from "@/lib/seedGuard";
import { createBooking, validateBooking } from "@/lib/bookings";
import type { BookingInput } from "@/lib/types";
import { proxyPublicBooking } from "@/lib/publicBookingProxy";

export async function POST(req: Request) {
  const proxied = await proxyPublicBooking(req.clone(), "/public/bookings");
  if (proxied) return proxied;
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  let body: Partial<BookingInput>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input: Partial<BookingInput> = {
    ...body,
    numberOfAdults: Number(body.numberOfAdults),
    numberOfChildren: Number(body.numberOfChildren) || 0,
    name: body.name?.trim(),
    email: body.email?.trim(),
    phone: body.phone?.trim(),
    notes: body.notes?.trim() || undefined,
  };

  const result = validateBooking(input);
  if (!result.ok) {
    return Response.json({ errors: result.errors }, { status: 422 });
  }

  // TODO: persist to the database and send the confirmation email here.
  const booking = createBooking(input as BookingInput);
  return Response.json(booking, { status: 201 });
}
