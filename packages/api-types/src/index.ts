/**
 * The wire contract between the Spring Boot API and every frontend.
 *
 * This package is the single definition of what crosses the network. The
 * frontend imports it; the backend is held to it. Before this existed the
 * two sides agreed only by convention documented in a Markdown file, and
 * they drifted so far apart that they modelled entirely different domains —
 * the site asked for `/activities` and `/stays` while the API served
 * `/tours` and `/reservations`, with no overlapping endpoint at all.
 *
 * Rules for this file:
 *
 *   1. Only shapes that actually travel over the wire. No view models, no
 *      presentation concerns — labels, formatting and copy belong to the app
 *      that renders them, not to the contract.
 *   2. Only rules both sides must agree on. MAX_PARTY_SIZE lives here because
 *      the client validates against it and the server enforces it; if they
 *      disagree, bookings fail in a way neither side can explain.
 *   3. Changing anything here is a breaking change for two applications.
 *      Treat it as an API version bump, not an edit.
 *
 * See docs/ for the endpoint-level contract.
 */

/* ------------------------------------------------------------------ shared */

export type TimeSlot = "morning" | "golden-hour";

export type Difficulty = "Easy" | "Moderate" | "Adventurous";

/** Where a review was originally left — rendered as provenance. */
export type ReviewSource =
  | "direct"
  | "tripadvisor"
  | "getyourguide"
  | "google"
  | "airbnb"
  | "booking"
  | "wetravel";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

/**
 * Upper bound on a single booking's party size.
 *
 * Shared deliberately: the client uses it to validate before submitting and
 * the server enforces it authoritatively. A client-only limit is advisory,
 * and a server-only limit produces a rejection the form cannot explain.
 */
export const MAX_PARTY_SIZE = 12;

/* -------------------------------------------------------------- catalogue */

/**
 * An on-site experience at the camp — a ride or activity, sold either on its
 * own or as an add-on to a stay.
 *
 * Backend note: projected from `Tour`. `slug` is the public route key and
 * must carry the legacy French slug from the WordPress site, because those
 * URLs hold the existing search rankings.
 */
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
  /** Per person, in the currency the endpoint was asked for. */
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
 * A nuitée — an overnight stay at the Sabria camp.
 *
 * Everything Dunes Insolites sells happens on-site here. Multi-day touring
 * circuits departing Djerba are Route Insolite's product, a separate legal
 * entity on the same platform, distinguished by company on the backend.
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
  /** Check-in times, what to bring, what the nights are like. */
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

export type GalleryItem = {
  src: string;
  alt: string;
  tag: string;
  tall?: boolean;
};

/** Headline figures on the landing page. Strings, not numbers — they are
 *  presentational ("40 000+", "4,9") and formatted at the source. */
export type Stats = {
  guestsGuided: string;
  /** Optional: undefined means no real reviews exist yet to average - the
   *  honest state for a business with zero reviews, not a placeholder
   *  number. Never fabricate a value here; the UI shows a "New" label
   *  instead when this is absent. */
  avgRating?: string;
  yearsRunning: string;
};

/* ---------------------------------------------------------------- reviews */

export type Review = {
  id: string;
  name: string;
  /** Optional: a review from this app's own direct in-app system (the only
   *  real source today) has no country on file - inventing one would be
   *  the same fabrication this field exists to avoid elsewhere. Only a
   *  genuine platform export (TripAdvisor/GetYourGuide/Google) carries it. */
  country?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Not every platform gives a review a headline — GetYourGuide's format
   *  does not. Omit rather than invent one. */
  title?: string;
  /** Kept in the guest's original language. Translating a real review
   *  misrepresents what they actually said. */
  body: string;
  /** The specific activity this review is about, if any. */
  activitySlug?: string;
  /** The specific stay this review is about, if any. */
  staySlug?: string;
  source: ReviewSource;
};

/* --------------------------------------------------------------- bookings */

/** Availability for one slot on one date. */
export type SlotAvailability = {
  slot: TimeSlot;
  seatsLeft: number;
  available: boolean;
};

/**
 * A booking for a single activity.
 *
 * `total` is computed and returned by the server. The client may display an
 * estimate, but a client-sent total is never trusted.
 */
export type Booking = {
  id: string;
  activitySlug: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  timeSlot: TimeSlot;
  partySize: number;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  total: number;
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export type BookingInput = Omit<Booking, "id" | "status" | "total" | "createdAt">;

/**
 * Reserving a nuitée, with any activities added on by `Activity.slug`.
 *
 * No per-activity time slot: the camp confirms the hour with the guest on
 * arrival, because it depends on who else is on-site that day.
 */
export type StayBooking = {
  id: string;
  staySlug: string;
  accommodationSlug?: string;
  /** How many of that accommodation to book. Only meaningful alongside
   *  `accommodationSlug`. */
  accommodationQty?: number;
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

export type StayBookingInput = Omit<
  StayBooking,
  "id" | "status" | "total" | "createdAt"
>;

/* ----------------------------------------------------------------- errors */

/**
 * The error body every endpoint returns on failure.
 *
 * Mirrors GlobalExceptionHandler on the backend. `errors` is present only on
 * validation failures (422/400) and is keyed by field name so a form can
 * attach each message to its input.
 */
export type ApiError = {
  status: number;
  message: string;
  errors?: Record<string, string>;
};
