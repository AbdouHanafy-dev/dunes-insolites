/**
 * The single seam between this frontend and its backend.
 *
 * Every page and component reads data through this module — nothing imports
 * `lib/data/*` directly any more. To point the site at the Spring Boot API,
 * set one environment variable:
 *
 *     NEXT_PUBLIC_API_URL=https://api.dunes-insolites.tn
 *
 * With it unset, everything falls back to the local seed data and the Next.js
 * route handlers, so the site stays fully clickable with no backend running.
 *
 * The exact endpoints and payloads expected are in API_CONTRACT.md.
 */

import {
  getActivities as seedActivities,
  getActivity as seedActivity,
  getRelated as seedRelated,
} from "@/lib/data/activities";
import { fullGallery as seedGallery, galleryItems as seedStrip } from "@/lib/data/gallery";
import { reviews as seedReviews } from "@/lib/data/reviews";
import { stats as seedStats } from "@/lib/data/stats";
import {
  getStays as seedStays,
  getStay as seedStay,
  getRelatedStays as seedRelatedStays,
} from "@/lib/data/stays";
import type {
  Activity,
  Booking,
  BookingInput,
  GalleryItem,
  Review,
  Stats,
  Stay,
  StayBooking,
  StayBookingInput,
} from "@/lib/types";
import type { SlotAvailability } from "@/lib/bookings";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** True once a real backend is configured. */
export const usingRemoteApi = BASE !== "";

/** Absolute URL for the backend, or a relative Next.js route when local. */
function url(path: string): string {
  return BASE ? `${BASE}${path}` : `/api${path}`;
}

type FetchOpts = { revalidate?: number; signal?: AbortSignal };

async function get<T>(path: string, fallback: T, opts: FetchOpts = {}): Promise<T> {
  // Server components with no backend configured read the seed directly —
  // fetching our own route handler during a build would deadlock.
  if (!BASE && typeof window === "undefined") return fallback;

  try {
    const res = await fetch(url(path), {
      signal: opts.signal,
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    // A backend hiccup should degrade to seed content, never blank the page.
    return fallback;
  }
}

/* ------------------------------------------------------------------ reads */

export async function getActivities(): Promise<Activity[]> {
  const data = await get<{ activities: Activity[] }>(
    "/activities",
    { activities: seedActivities() },
    { revalidate: 300 },
  );
  return data.activities ?? seedActivities();
}

export async function getActivity(slug: string): Promise<Activity | undefined> {
  if (!BASE) return seedActivity(slug);
  const all = await getActivities();
  return all.find((a) => a.slug === slug);
}

export async function getRelatedActivities(slug: string): Promise<Activity[]> {
  if (!BASE) return seedRelated(slug);
  const all = await getActivities();
  return all.filter((a) => a.slug !== slug);
}

export async function getStats(): Promise<Stats> {
  return get<Stats>("/stats", seedStats, { revalidate: 3600 });
}

export async function getStays(): Promise<Stay[]> {
  const data = await get<{ stays: Stay[] }>(
    "/stays",
    { stays: seedStays() },
    { revalidate: 300 },
  );
  return data.stays ?? seedStays();
}

export async function getStay(slug: string): Promise<Stay | undefined> {
  if (!BASE) return seedStay(slug);
  const all = await getStays();
  return all.find((s) => s.slug === slug);
}

export async function getRelatedStays(slug: string): Promise<Stay[]> {
  if (!BASE) return seedRelatedStays(slug);
  const all = await getStays();
  return all.filter((s) => s.slug !== slug);
}

export async function getGallery(): Promise<GalleryItem[]> {
  const data = await get<{ items: GalleryItem[] }>(
    "/gallery",
    { items: seedGallery },
    { revalidate: 600 },
  );
  return data.items ?? seedGallery;
}

/** The five-tile strip on the landing page, not the full gallery. */
export async function getGalleryStrip(): Promise<GalleryItem[]> {
  if (!BASE) return seedStrip;
  const all = await getGallery();
  return all.slice(0, 5);
}

export async function getReviews(activitySlug?: string): Promise<Review[]> {
  const path = activitySlug ? `/reviews?activity=${encodeURIComponent(activitySlug)}` : "/reviews";
  const fallback = activitySlug
    ? seedReviews.filter((r) => r.activitySlug === activitySlug)
    : seedReviews;
  const data = await get<{ reviews: Review[] }>(path, { reviews: fallback }, { revalidate: 600 });
  return data.reviews ?? fallback;
}

export async function getAvailability(
  activity: string,
  date: string,
  signal?: AbortSignal,
): Promise<SlotAvailability[]> {
  const path = `/availability?activity=${encodeURIComponent(activity)}&date=${encodeURIComponent(date)}`;
  const data = await get<{ slots: SlotAvailability[] }>(path, { slots: [] }, { signal });
  return data.slots ?? [];
}

export async function getBooking(id: string): Promise<Booking | null> {
  try {
    const res = await fetch(url(`/bookings/${encodeURIComponent(id)}`));
    if (!res.ok) return null;
    return (await res.json()) as Booking;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- writes */

export type WriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors?: Record<string, string>; message?: string };

async function post<T>(path: string, body: unknown): Promise<WriteResult<T>> {
  try {
    const res = await fetch(url(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data as T };
    return {
      ok: false,
      errors: (data as { errors?: Record<string, string> }).errors,
      message: (data as { error?: string }).error,
    };
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}

export function createBooking(input: BookingInput): Promise<WriteResult<Booking>> {
  return post<Booking>("/bookings", input);
}

export function createStayBooking(
  input: StayBookingInput,
): Promise<WriteResult<StayBooking>> {
  return post<StayBooking>("/stay-bookings", input);
}

export function sendContact(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<WriteResult<{ ok: true }>> {
  return post<{ ok: true }>("/contact", input);
}

export function subscribe(email: string): Promise<WriteResult<{ ok: true }>> {
  return post<{ ok: true }>("/subscribe", { email });
}

/* ------------------------------------------------------------------- auth */

export type AuthUser = { id: string; name: string; email: string };

/**
 * No session handling lives in this frontend on purpose. Spring Boot should
 * answer these by setting an httpOnly, Secure, SameSite cookie — a token
 * handed back in JSON and parked in localStorage is readable by any injected
 * script. See API_CONTRACT.md.
 */
export function login(input: {
  email: string;
  password: string;
}): Promise<WriteResult<AuthUser>> {
  return post<AuthUser>("/auth/login", input);
}

export function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<WriteResult<AuthUser>> {
  return post<AuthUser>("/auth/register", input);
}
