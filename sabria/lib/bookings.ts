import { getActivity } from "@/lib/data/activities";
import { MAX_PARTY_SIZE, type Booking, type BookingInput, type TimeSlot } from "@/lib/types";

/**
 * In-memory store so the frontend flow is fully clickable without a database.
 * Replace with Prisma/Postgres — the exported functions are the whole surface.
 */
const store = new Map<string, Booking>();

/** Seats each slot can hold before it shows as sold out. */
const SLOT_CAPACITY = 12;

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export function isFutureDate(date: string): boolean {
  if (!isValidDate(date)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) >= today;
}

function seatsTaken(activitySlug: string, date: string, slot: TimeSlot): number {
  let taken = 0;
  for (const b of store.values()) {
    if (
      b.activitySlug === activitySlug &&
      b.date === date &&
      b.timeSlot === slot &&
      b.status !== "cancelled"
    ) {
      taken += b.partySize;
    }
  }
  return taken;
}

/**
 * Deterministic pseudo-availability so the same date always renders the same
 * way across server and client. Real implementation reads the ops calendar.
 */
function baselineTaken(activitySlug: string, date: string, slot: TimeSlot): number {
  const key = `${activitySlug}|${date}|${slot}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % (SLOT_CAPACITY + 1);
}

export type SlotAvailability = {
  slot: TimeSlot;
  seatsLeft: number;
  available: boolean;
};

export function getAvailability(activitySlug: string, date: string): SlotAvailability[] {
  const activity = getActivity(activitySlug);
  if (!activity || !isFutureDate(date)) return [];

  return activity.slots.map((slot) => {
    const taken = Math.min(
      SLOT_CAPACITY,
      baselineTaken(activitySlug, date, slot) + seatsTaken(activitySlug, date, slot),
    );
    const seatsLeft = SLOT_CAPACITY - taken;
    return { slot, seatsLeft, available: seatsLeft > 0 };
  });
}

export type ValidationResult = { ok: true } | { ok: false; errors: Record<string, string> };

export function validateBooking(input: Partial<BookingInput>): ValidationResult {
  const errors: Record<string, string> = {};
  const activity = input.activitySlug ? getActivity(input.activitySlug) : undefined;

  if (!activity) errors.activitySlug = "Pick an adventure.";
  if (!input.date) errors.date = "Pick a date.";
  else if (!isFutureDate(input.date)) errors.date = "Pick today or a future date.";

  if (!input.timeSlot) errors.timeSlot = "Pick a time slot.";
  else if (activity && !activity.slots.includes(input.timeSlot))
    errors.timeSlot = "That slot is not offered for this adventure.";

  const size = Number(input.partySize);
  if (!size || Number.isNaN(size)) errors.partySize = "How many of you?";
  else if (size < 1 || size > MAX_PARTY_SIZE)
    errors.partySize = `Party size must be between 1 and ${MAX_PARTY_SIZE}.`;

  if (!input.name?.trim()) errors.name = "We need a name for the booking.";
  if (!input.email?.trim()) errors.email = "We need an email for the confirmation.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "That email looks off.";
  if (!input.phone?.trim()) errors.phone = "A phone number, in case plans change.";

  if (activity && input.date && input.timeSlot && size && !errors.date && !errors.timeSlot) {
    const slot = getAvailability(activity.slug, input.date).find(
      (s) => s.slot === input.timeSlot,
    );
    if (!slot || !slot.available) errors.timeSlot = "That slot is full. Try another.";
    else if (slot.seatsLeft < size)
      errors.partySize = `Only ${slot.seatsLeft} seat${slot.seatsLeft === 1 ? "" : "s"} left in that slot.`;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

function makeId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DI-${id}`;
}

export function createBooking(input: BookingInput): Booking {
  const activity = getActivity(input.activitySlug)!;
  const booking: Booking = {
    ...input,
    id: makeId(),
    status: "pending",
    total: activity.priceFrom * input.partySize,
    createdAt: new Date().toISOString(),
  };
  store.set(booking.id, booking);
  return booking;
}

export function getBooking(id: string): Booking | undefined {
  return store.get(id);
}
