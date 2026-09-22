/**
 * The app's view of the domain.
 *
 * Wire shapes live in `@dunes/api-types` — the contract package the backend
 * is also held to — and are re-exported here so every existing
 * `@/lib/types` import keeps working and there is one obvious place to look.
 *
 * What stays in this file: presentation. Labels, formatting and copy are
 * this app's concern, not the API's. They are also the things that become
 * translated strings once next-intl lands, and translations have no business
 * in a contract shared with a Java service.
 */

export type {
  Accommodation,
  Activity,
  ApiError,
  Booking,
  BookingInput,
  BookingStatus,
  DepartureCity,
  Difficulty,
  GalleryItem,
  Review,
  ReviewSource,
  ServiceOptionSelection,
  SlotAvailability,
  Stats,
  Stay,
  StayBooking,
  StayBookingInput,
  TimeSlot,
  Tour,
  TourBooking,
  TourBookingInput,
} from "@dunes/api-types";

export { DEPARTURE_CITIES, MAX_PARTY_SIZE } from "@dunes/api-types";

import type { DepartureCity, Review, TimeSlot } from "@dunes/api-types";

/* --------------------------------------------------------- presentation */

/**
 * Slot times shown to the guest. The contract carries the slot identifier
 * (`morning`); the hour attached to it is operational copy that the camp can
 * change without an API version bump.
 */
export const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morning · 08:00",
  "golden-hour": "Golden hour · 16:30",
};

/** Display form of each DEPARTURE_CITIES value — same city names in every
 *  locale this site serves, so this isn't translated per-locale like other
 *  labels here. */
export const DEPARTURE_CITY_LABELS: Record<DepartureCity, string> = {
  TUNIS: "Tunis",
  SOUSSE: "Sousse",
  HAMMAMET: "Hammamet",
  DJERBA: "Djerba",
  MAHDIA: "Mahdia",
  MONASTIR: "Monastir",
};

/** How each review platform is credited in the UI. */
export const REVIEW_SOURCE_LABELS: Record<Review["source"], string> = {
  direct: "Verified booking",
  airbnb: "Airbnb",
  booking: "Booking.com",
  wetravel: "WeTravel",
  tripadvisor: "TripAdvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
};
