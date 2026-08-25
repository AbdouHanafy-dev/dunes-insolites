import { getStay } from "@/lib/data/stays";
import { activities } from "@/lib/data/activities";
import { isFutureDate, makeId } from "@/lib/bookings";
import { MAX_PARTY_SIZE, type StayBooking, type StayBookingInput } from "@/lib/types";

/**
 * In-memory store, same shape as `lib/bookings.ts` but for nuitées — a stay
 * date and party size, with optional activities (rideSlugs) tacked on. No
 * hour is picked here: the camp confirms timing with the guest on arrival,
 * since it depends on who else is booked in that day.
 */
const store = new Map<string, StayBooking>();

const activitySlugs = new Set(activities.map((a) => a.slug));

export type ValidationResult = { ok: true } | { ok: false; errors: Record<string, string> };

export function validateStayBooking(input: Partial<StayBookingInput>): ValidationResult {
  const errors: Record<string, string> = {};
  const stay = input.staySlug ? getStay(input.staySlug) : undefined;

  if (!stay) errors.staySlug = "Pick a stay.";
  else if (
    input.accommodationSlug &&
    !stay.accommodations?.some((accommodation) => accommodation.slug === input.accommodationSlug)
  ) {
    errors.accommodationSlug = "Pick an available accommodation.";
  }

  if (input.accommodationSlug) {
    const qty = Number(input.accommodationQty);
    if (!qty || Number.isNaN(qty) || qty < 1 || qty > 6) {
      errors.accommodationQty = "How many? Between 1 and 6.";
    }
  }

  if (!input.date) errors.date = "Pick a date.";
  else if (!isFutureDate(input.date)) errors.date = "Pick today or a future date.";

  const size = Number(input.partySize);
  if (!size || Number.isNaN(size)) errors.partySize = "How many of you?";
  else if (size < 1 || size > MAX_PARTY_SIZE)
    errors.partySize = `Party size must be between 1 and ${MAX_PARTY_SIZE}.`;

  if (input.rideSlugs?.some((slug) => !activitySlugs.has(slug))) {
    errors.rideSlugs = "One of those activities isn't one we offer.";
  }

  if (!input.name?.trim()) errors.name = "We need a name for the booking.";
  if (!input.email?.trim()) errors.email = "We need an email for the confirmation.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "That email looks off.";
  if (!input.phone?.trim()) errors.phone = "A phone number, in case plans change.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

export function createStayBooking(input: StayBookingInput): StayBooking {
  const stay = getStay(input.staySlug)!;
  const accommodation = stay.accommodations?.find((item) => item.slug === input.accommodationSlug);
  const total = accommodation
    ? accommodation.priceFrom * (input.accommodationQty ?? 1)
    : stay.priceFrom * input.partySize;
  const booking: StayBooking = {
    ...input,
    id: makeId(),
    status: "pending",
    total,
    createdAt: new Date().toISOString(),
  };
  store.set(booking.id, booking);
  return booking;
}

export function getStayBooking(id: string): StayBooking | undefined {
  return store.get(id);
}
