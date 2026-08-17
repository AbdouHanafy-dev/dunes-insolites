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
