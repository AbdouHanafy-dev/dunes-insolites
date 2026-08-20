import { createStayBooking, validateStayBooking } from "@/lib/stayBookings";
import type { StayBookingInput } from "@/lib/types";

export async function POST(req: Request) {
  let body: Partial<StayBookingInput>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input: Partial<StayBookingInput> = {
    ...body,
    partySize: Number(body.partySize),
    rideSlugs: Array.isArray(body.rideSlugs) ? body.rideSlugs : [],
    name: body.name?.trim(),
    email: body.email?.trim(),
    phone: body.phone?.trim(),
    notes: body.notes?.trim() || undefined,
  };

  const result = validateStayBooking(input);
  if (!result.ok) {
    return Response.json({ errors: result.errors }, { status: 422 });
  }

  // TODO: persist to the database and send the confirmation email here.
  const booking = createStayBooking(input as StayBookingInput);
  return Response.json(booking, { status: 201 });
}
