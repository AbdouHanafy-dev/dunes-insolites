export type TimeSlot = "morning" | "golden-hour";

export type Difficulty = "Easy" | "Moderate" | "Adventurous";

export type Activity = {
  slug: string;
  title: string;
  kicker: string;
  tagline: string;
  description: string;
  longDescription: string[];
  heroImage: string;
  cardImage: string;
  gallery: string[];
  priceFrom: number;
  durationMins: number;
  difficulty: Difficulty;
  groupSize: string;
  included: string[];
  notIncluded: string[];
  meetingPoint: string;
  slots: TimeSlot[];
};

/**
 * A nuitée — an overnight stay at the Sabria camp. Everything Dunes
 * Insolites does happens on-site here; there's no multi-day touring product
 * (that's a different business). A stay is reservable directly, with
 * activities offered as optional add-ons (see `StayBooking.rideSlugs`).
 */
export type Stay = {
  slug: string;
  title: string;
  kicker: string;
  tagline: string;
  description: string;
  longDescription: string[];
  image: string;
  gallery: string[];
  priceFrom: number;
  groupSize: string;
  included: string[];
  notIncluded: string[];
  /** Bullets for the "Informations Pratiques" section — check-in times,
   *  what to bring, what the nights are like. */
  practicalInfo: string[];
  arrivalTime: string;
  departureTime: string;
  itinerary: Array<{
    time: string;
    title: string;
    description: string;
  }>;
  accommodations?: Accommodation[];
};

export type Accommodation = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
  priceFrom: number;
  sleeps: string;
  features: string[];
};

export type Stats = {
  guestsGuided: string;
  avgRating: string;
  yearsRunning: string;
};

export type GalleryItem = {
  src: string;
  alt: string;
  tag: string;
  tall?: boolean;
};

export type Review = {
  id: string;
  name: string;
  country: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  title: string;
  body: string;
  activitySlug: string;
  /** Where the review was originally left — shown as provenance. */
  source: "direct" | "tripadvisor" | "getyourguide" | "google";
};

export const REVIEW_SOURCE_LABELS: Record<Review["source"], string> = {
  direct: "Verified booking",
  tripadvisor: "TripAdvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
};

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  id: string;
  activitySlug: string;
  date: string;
  timeSlot: TimeSlot;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  total: number;
  createdAt: string;
};

export type BookingInput = Omit<Booking, "id" | "status" | "total" | "createdAt">;

export const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morning · 08:00",
  "golden-hour": "Golden hour · 16:30",
};

export const MAX_PARTY_SIZE = 12;

/**
 * Reserving a nuitée — a stay date, party size, and any activities the
 * guest wants added on (by `Activity.slug`, e.g. "camel-trek"). No time
 * slot per ride: the camp confirms the hour with the guest on arrival,
 * since it depends on who else is on-site that day.
 */
export type StayBooking = {
  id: string;
  staySlug: string;
  accommodationSlug?: string;
  date: string;
  partySize: number;
  rideSlugs: string[];
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  total: number;
  createdAt: string;
};

export type StayBookingInput = Omit<StayBooking, "id" | "status" | "total" | "createdAt">;
