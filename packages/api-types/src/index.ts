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
  /** Whether booking this stay requires picking a GUIDE-category service option. */
  guideRequired?: boolean;
  /** Maximum nights bookable in one reservation. 1 (default) = fixed
   *  single-night stay, the booking flow only asks for an arrival date.
   *  Greater than 1 = the guest picks an arrival+departure range, capped
   *  at this many nights. */
  maxNights?: number;
};

/**
 * A multi-day circuit — Route Insolite's product, departing Djerba.
 *
 * Backend note: projected from `Tour`. Route Insolite has no backoffice or
 * vitrine of its own yet (R4, unscheduled) — real circuits are managed from
 * the shared admin and, since 18 Sep 2026 (business owner, explicit; see
 * docs/OPEN-QUESTIONS.md Q6's addendum), published on dunes-insolites.com
 * under /circuits. Unlike Activity/Stay, Tour has no capacity/availability
 * concept — booking is request-to-book, staff confirm.
 */
export type Tour = {
  slug: string;
  title: string;
  description: string;
  aboutText: string | null;
  duration: string;
  location: string | null;
  meetingPoint: string | null;
  groupSize: string;
  languages: string[];
  coverImage: string | null;
  gallery: string[];
  highlights: string[];
  included: string[];
  notIncluded: string[];
  itinerary: Array<{
    label: string | null;
    title: string | null;
    description: string | null;
    segmentType: "ACTIVITY" | "TRANSFER" | null;
    optionalSegment: boolean | null;
    durationMinutes: number | null;
  }>;
  cancellationPolicy: {
    freeCancellation: boolean | null;
    hoursBeforeDeadline: number | null;
  } | null;
  /** Per adult, in the currency the endpoint was asked for. Same as `passengerAdultPrice`, or the
   *  active sale price when one is running (see `originalPriceFrom`). */
  priceFrom: number;
  /** Only set when a real sale is running (admin-set, lower than the regular rate) — the
   *  struck-through "was" price. Null means no discount; never a fabricated one. */
  originalPriceFrom: number | null;
  passengerAdultPrice: number;
  passengerChildPrice: number;
  averageRating: number | null;
  reviewCount: number | null;
  /** Real count of confirmed/checked-in/completed bookings made yesterday (server-local
   *  calendar day). 0 when none — never fabricated. */
  bookedYesterdayCount: number;

  guideType: "NONE" | "TOUR_GUIDE" | "RECEPTION_STAFF" | "INSTRUCTOR" | "DRIVER" | null;
  foodIncluded: boolean | null;
  meals: Array<{
    mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | null;
    format: "BUFFET" | "SET_MENU" | "ALA_CARTE" | "PICNIC" | null;
  }>;
  drinksIncluded: boolean | null;
  dietaryRestrictions: string[];
  transportIncluded: boolean | null;
  transportModes: string[];

  notSuitableFor: string[];
  notAllowed: string[];
  animalsAccepted: boolean | null;
  petPolicyNote: string | null;
  mustBring: string[];
  goodToKnow: string | null;
  emergencyPhone: string | null;
  ticketInfo: string | null;
};

/**
 * Cities the guest can depart from for pickup — TOURS and HEBERGEMENT
 * (stay) reservations only, never a standalone EXTRAS activity booking
 * (the camp confirms the activity hour on arrival, no pickup routing).
 * One shared definition, both sides enforce it (client dropdown, server
 * validation), same rule as MAX_PARTY_SIZE above — see this file's own
 * header comment on what belongs in this contract.
 */
export const DEPARTURE_CITIES = [
  "TUNIS",
  "SOUSSE",
  "HAMMAMET",
  "DJERBA",
  "MAHDIA",
  "MONASTIR",
] as const;
export type DepartureCity = (typeof DEPARTURE_CITIES)[number];

/**
 * Booking a Tour — one departure date, adults/children, contact details,
 * and (since 19 Sep 2026) the same "Getting There & Guide" + extras step
 * `StayBookingInput` already has: a circuit's own price covers the route
 * itself, not the guide/support-vehicle/extra activities layered on top.
 */
export type TourBooking = {
  id: string;
  tourSlug: string;
  date: string;
  numberOfAdults: number;
  numberOfChildren: number;
  rideSlugs: string[];
  /** How the guest reaches the meeting point; validated against selected transport options. */
  arrivalMode: "OWN_VEHICLE" | "TRANSPORT";
  /** Where the guest departs from for pickup. Optional — not every guest arranges pickup through the site. */
  departureCity?: DepartureCity;
  /** Optional return leg after the tour ends — same city catalog as
   *  `departureCity`, reused rather than a second field set. The guest may
   *  skip this; staff arrange the driver later. */
  returnCity?: DepartureCity;
  serviceOptions?: ServiceOptionSelection[];
  /** SpokenLanguage ids the guest prefers, from the admin-managed catalog
   *  (see Language / getLanguages), so staff can assign a Guide who speaks
   *  one. Not a fixed FR/EN/AR set — the catalog can grow. */
  preferredLanguageIds?: string[];
  /** Free-text fallback when the guest's language isn't in the catalog. */
  otherLanguageRequested?: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  total: number;
  createdAt: string;
};

export type TourBookingInput = Omit<TourBooking, "id" | "status" | "total" | "createdAt"> & {
  idempotencyKey: string;
  acceptedTerms: boolean;
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
  // Max bookable units of this tier for a given stay, when configured.
  // Absent/undefined means inventory isn't configured - no ceiling to enforce.
  maxUnits?: number;
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
  /** The specific Tour circuit this review is about, if any. */
  tourSlug?: string;
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
  /** Same adults/children split as `TourBooking`, for one consistent
   *  booking shape across the site, even though Extra pricing (unlike
   *  Tour) doesn't differentiate by age — kept for headcount accuracy. */
  numberOfAdults: number;
  numberOfChildren: number;
  /** Other ACTIVITY-category Extra slugs added on top of this one, same
   *  convention as `TourBooking.rideSlugs`. */
  rideSlugs: string[];
  /** How the guest reaches the activity; same "Getting There" step as a
   *  Tour/Stay booking — a standalone activity guest may not already be
   *  at the camp. */
  arrivalMode: "OWN_VEHICLE" | "TRANSPORT";
  /** Where the guest departs from for pickup. Optional — not every guest arranges pickup through the site. */
  departureCity?: DepartureCity;
  /** Optional return leg after the activity ends — same city catalog as
   *  `departureCity`, reused rather than a second field set. The guest may
   *  skip this; staff arrange the driver later. */
  returnCity?: DepartureCity;
  /** SpokenLanguage ids the guest prefers, from the admin-managed catalog,
   *  so staff can assign an instructor/guide who speaks one. */
  preferredLanguageIds?: string[];
  /** Free-text fallback when the guest's language isn't in the catalog. */
  otherLanguageRequested?: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  total: number;
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export type BookingInput = Omit<Booking, "id" | "status" | "total" | "createdAt"> & {
  idempotencyKey: string;
  acceptedTerms: boolean;
};

/**
 * Reserving a nuitée, with any activities added on by `Activity.slug`.
 *
 * No per-activity time slot: the camp confirms the hour with the guest on
 * arrival, because it depends on who else is on-site that day.
 */
/**
 * A guide (with support vehicle, or riding in the guest's own vehicle) or
 * transport/pickup option chosen in the "Getting There & Guide" step, by
 * `ServiceOption.slug` - same convention as `rideSlugs`. The pickup fields
 * only matter for an option whose catalogue entry requires pickup
 * details; the backend rejects the booking if they're missing on one
 * that does.
 */
export type ServiceOptionSelection = {
  serviceOptionSlug: string;
  /** Days / persons / vehicles depending on the option's pricing unit. Defaults to 1. */
  quantity?: number;
  pickupHotelName?: string;
  pickupAirport?: string;
  pickupFlightNumber?: string;
  pickupAddress?: string;
  pickupArrivalTime?: string;
  pickupInstructions?: string;
};

export type StayBooking = {
  id: string;
  staySlug: string;
  accommodationSlug?: string;
  /** How many of that accommodation to book. Only meaningful alongside
   *  `accommodationSlug`. */
  accommodationQty?: number;
  date: string;
  /** How many nights this booking covers, computed client-side from the
   *  guest's arrival/departure picks. Defaults to 1 (a fixed single-night
   *  stay only ever asks for the arrival date). Validated against the
   *  stay's own `maxNights`. */
  nights?: number;
  partySize: number;
  rideSlugs: string[];
  /** How the guest reaches the experience; validated against selected transport options. */
  arrivalMode: "OWN_VEHICLE" | "TRANSPORT";
  /** Where the guest departs from for pickup. Optional — not every guest arranges pickup through the site. */
  departureCity?: DepartureCity;
  /** Optional return leg after the stay ends — same city catalog as
   *  `departureCity`, reused rather than a second field set. The guest may
   *  skip this; staff arrange the driver later. */
  returnCity?: DepartureCity;
  serviceOptions?: ServiceOptionSelection[];
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
> & {
  idempotencyKey: string;
  acceptedTerms: boolean;
};

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
