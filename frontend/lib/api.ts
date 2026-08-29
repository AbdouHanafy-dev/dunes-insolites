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

// DI-031 — a production deploy with no backend configured (or one that's
// unreachable) would otherwise silently serve 100% seed/placeholder data —
// stale marketing prices as though they were live — to every real visitor,
// with no error and no signal anywhere. Tolerable in dev, where running
// without a backend is the normal, deliberate case; never acceptable once
// this app is actually deployed.
//
// Deliberately NOT process.env.NODE_ENV: `next build` always sets
// NODE_ENV=production, including a developer running a plain local build
// to verify something before a backend is even up — the exact workflow
// this session used repeatedly. Gating on NODE_ENV made `npm run build`
// fail every time, confirmed by actually running it, not assumed. DEPLOY_ENV
// is a new, separate variable this codebase doesn't set anywhere yet —
// the real production host must set DEPLOY_ENV=production explicitly
// (part of DI-030, not yet done) for this guard to ever fire. Its absence
// means "not deployed as production" by default, same as today.
const IS_REAL_PRODUCTION = process.env.DEPLOY_ENV === "production";

/** True once a real backend is configured. */
export const usingRemoteApi = BASE !== "";

/** Absolute URL for the backend, or a relative Next.js route when local. */
function url(path: string): string {
  return BASE ? `${BASE}${path}` : `/api${path}`;
}

/** `?locale=de` for the real backend's public catalog endpoints; omitted for French/unset (its own fallback). */
function localeQuery(locale?: string): string {
  return locale && locale !== "fr" ? `?locale=${encodeURIComponent(locale)}` : "";
}

type FetchOpts = { revalidate?: number; signal?: AbortSignal };

async function get<T>(path: string, fallback: T, opts: FetchOpts = {}): Promise<T> {
  if (!BASE) {
    if (IS_REAL_PRODUCTION) {
      // A misconfigured production deploy - fail loudly and immediately
      // rather than quietly shipping a site that looks live but is 100%
      // placeholder content. This is the one case DI-031 treats as a hard
      // error, not a degrade: there is no real backend to have hiccuped.
      throw new Error(
        `NEXT_PUBLIC_API_URL is not set in production — refusing to silently serve seed data for "${path}".`,
      );
    }
    // Server components with no backend configured read the seed directly —
    // fetching our own route handler during a build would deadlock. Dev/
    // preview only; production never reaches this line (see above).
    if (typeof window === "undefined") return fallback;
  }

  try {
    const res = await fetch(url(path), {
      signal: opts.signal,
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    });
    if (!res.ok) {
      if (IS_REAL_PRODUCTION) {
        console.error(`[lib/api] ${path} returned ${res.status} — falling back to seed data`);
      }
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    // A transient backend hiccup still degrades to seed content rather than
    // blanking the page - the difference DI-031 adds is that production no
    // longer does this in total silence (see the console.error above/below);
    // an unset NEXT_PUBLIC_API_URL is the one case treated as a hard error
    // instead, since a permanently-missing backend isn't a hiccup.
    if (IS_REAL_PRODUCTION) {
      console.error(`[lib/api] ${path} fetch failed — falling back to seed data`, err);
    }
    return fallback;
  }
}

/* -------------------------------------------------------------------- CMS */

export type CmsBlock = { type: string; data: Record<string, unknown> };

export type CmsPage = {
  slug: string;
  title: string;
  locale: string;
  seoTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  noFollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  blocks: CmsBlock[];
};

/**
 * A page authored in the admin CMS (Pages collection) — only ever returns a
 * PUBLISHED page, `null` for a draft, a page that doesn't exist yet, or when
 * no backend is configured at all. Callers fall back to their own hardcoded
 * content when this is `null`, so an editor forgetting to publish never
 * blanks a live route — see frontend/CLAUDE.md and the pages that call this.
 */
export async function getCmsPage(slug: string, locale?: string): Promise<CmsPage | null> {
  if (!BASE) return null;
  const loc = (locale ?? "fr").toUpperCase();
  return get<CmsPage | null>(
    `/public/pages/${encodeURIComponent(slug)}?locale=${loc}&companyType=DUNES_INSOLITES`,
    null,
    { revalidate: 300 },
  );
}

export type CmsNavItem = {
  navItemId: string;
  label: string;
  url: string;
  menuType: "NONE" | "EXPERIENCES" | "STAYS";
  displayOrder: number;
};

/**
 * Admin-managed nav items for one locale, ordered. An empty array (no
 * backend configured, nothing authored for this locale yet, or a fetch
 * failure) is the normal case today — callers fall back to the hardcoded
 * `nav` array in lib/site.ts, exactly as before this existed. See
 * components/Header.tsx and docs/cms.md.
 */
export type CmsRedirect = { fromPath: string; toPath: string; statusCode: number };

/**
 * Every configured redirect, unfiltered — middleware.ts fetches this
 * (cached, not per-request thanks to revalidate) and matches the incoming
 * pathname before falling through to normal routing. An empty array (no
 * backend configured, or nothing set up yet) means middleware simply never
 * redirects — failing open, same as every other CMS fallback in this file.
 */
export async function getRedirects(): Promise<CmsRedirect[]> {
  if (!BASE) return [];
  return get<CmsRedirect[]>("/public/redirects", [], { revalidate: 300 });
}

export async function getNavigation(locale?: string): Promise<CmsNavItem[]> {
  if (!BASE) return [];
  const loc = (locale ?? "fr").toUpperCase();
  return get<CmsNavItem[]>(
    `/public/navigation?locale=${loc}&companyType=DUNES_INSOLITES`,
    [],
    { revalidate: 300 },
  );
}

/* ------------------------------------------------------------------ reads */

// `locale` is a plain passthrough parameter here, not resolved via
// next-intl's `getLocale()` - that import is server-only, and this module
// is also imported by several Client Components (BookingFlow, AuthForm,
// etc.) for the write/auth functions further down. A top-level server-only
// import here would break their client bundle. Server Component callers
// resolve the current locale themselves (via `getLocale()` or their own
// `params`) and pass it in.
export async function getActivities(locale?: string): Promise<Activity[]> {
  const data = await get<{ activities: Activity[] }>(
    `/public/activities${localeQuery(locale)}`,
    { activities: seedActivities(locale) },
    { revalidate: 300 },
  );
  return data.activities ?? seedActivities(locale);
}

export async function getActivity(slug: string, locale?: string): Promise<Activity | undefined> {
  if (!BASE) return seedActivity(slug, locale);
  // A dedicated endpoint per DI-012 - no need to fetch the whole collection
  // and filter client-side for a single lookup. Falls back to seed on a
  // backend hiccup rather than 404ing, matching every other read here.
  return get<Activity | undefined>(
    `/public/activities/${encodeURIComponent(slug)}${localeQuery(locale)}`,
    seedActivity(slug, locale),
  );
}

export async function getRelatedActivities(slug: string, locale?: string): Promise<Activity[]> {
  if (!BASE) return seedRelated(slug, locale);
  const all = await getActivities(locale);
  return all.filter((a) => a.slug !== slug);
}

export async function getStats(): Promise<Stats> {
  return get<Stats>("/stats", seedStats, { revalidate: 3600 });
}

export async function getStays(locale?: string): Promise<Stay[]> {
  const data = await get<{ stays: Stay[] }>(
    `/public/stays${localeQuery(locale)}`,
    { stays: seedStays(locale) },
    { revalidate: 300 },
  );
  return data.stays ?? seedStays(locale);
}

export async function getStay(slug: string, locale?: string): Promise<Stay | undefined> {
  if (!BASE) return seedStay(slug, locale);
  // A dedicated endpoint per DI-012 - no need to fetch the whole collection
  // and filter client-side for a single lookup. Falls back to seed on a
  // backend hiccup rather than 404ing, matching every other read here.
  return get<Stay | undefined>(
    `/public/stays/${encodeURIComponent(slug)}${localeQuery(locale)}`,
    seedStay(slug, locale),
  );
}

export async function getRelatedStays(slug: string, locale?: string): Promise<Stay[]> {
  if (!BASE) return seedRelatedStays(slug, locale);
  const all = await getStays(locale);
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

export async function getReviews(filter?: {
  activitySlug?: string;
  staySlug?: string;
}): Promise<Review[]> {
  const params = new URLSearchParams();
  if (filter?.activitySlug) params.set("activity", filter.activitySlug);
  if (filter?.staySlug) params.set("stay", filter.staySlug);
  const qs = params.toString();
  const path = qs ? `/reviews?${qs}` : "/reviews";

  // A stay page also carries general (untagged) reviews — they're about the
  // camp overall, which is what a stay page represents. Activity pages stay
  // narrowly filtered to that one ride.
  const fallback = filter?.activitySlug
    ? seedReviews.filter((r) => r.activitySlug === filter.activitySlug)
    : filter?.staySlug
      ? seedReviews.filter((r) => r.staySlug === filter.staySlug || (!r.staySlug && !r.activitySlug))
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
  // Real backend has this under /public/bookings (guest checkout, DI-013);
  // the local route handler stand-in keeps the shorter /bookings path.
  return post<Booking>(usingRemoteApi ? "/public/bookings" : "/bookings", input);
}

export function createStayBooking(
  input: StayBookingInput,
): Promise<WriteResult<StayBooking>> {
  return post<StayBooking>(
    usingRemoteApi ? "/public/stay-bookings" : "/stay-bookings",
    input,
  );
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

export type AuthUser = { id: string; name: string; email: string; role: string };

/**
 * Always same-origin (`/api/auth/...`), never the direct-to-backend branch
 * `post()`/`url()` take when NEXT_PUBLIC_API_URL is set. Login/register have
 * to go through our own Next.js route handlers, not straight to the Spring
 * Boot backend, because only our own route handler can set the httpOnly
 * session cookie on our own origin — see lib/session.ts.
 */
async function postLocal<T>(path: string, body: unknown): Promise<WriteResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
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

/**
 * No token ever reaches this module or client JS — the Next.js route handler
 * at app/api/auth/login sets an httpOnly session cookie itself and only
 * returns { id, name, email, role }. See lib/session.ts for why.
 */
export function login(input: {
  email: string;
  password: string;
}): Promise<WriteResult<AuthUser>> {
  return postLocal<AuthUser>("/auth/login", input);
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<WriteResult<AuthUser>> {
  return postLocal<AuthUser>("/auth/register", input);
}

export function logout(): Promise<void> {
  return fetch("/api/auth/logout", { method: "POST" }).then(() => undefined);
}

/* ------------------------------------------------------------ account area */

// Real backend shapes (ReservationResponse/ReviewResponse), not the vitrine's
// simplified Booking/Review — the account area reads the account owner's own
// data straight from the Spring Boot API, so it's typed against what that
// API actually returns rather than the seed-data model the public vitrine
// pages use. No seed fallback exists for these: without a real backend
// there's no session to have gotten here with in the first place.

// `catalogTourTypeId`/`catalogTourId`/`catalogExtraId` are the real catalog
// product's UUID — the same id ProductType-scoped review endpoints expect.
// The public vitrine's Activity/Stay types key on `slug` instead, which the
// review endpoints don't accept, so past reservations (which do carry these
// ids) are the only current path to "leave a review" — see the reviews page.
export type MyReservationLine = { catalogTourTypeId?: string; catalogTourId?: string; name: string; totalPrice: number };
export type MyReservationExtraLine = { catalogExtraId: string; name: string; totalPrice: number };

export type MyPaymentSummary = {
  originalTotalAmount: number;
  totalPaid: number;
  remainingTotal: number;
  paymentStatus: string;
};

export type MyTransaction = {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  transactionDate: string;
};

export type MyReservation = {
  reservationId: string;
  reservationType: string;
  status: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  serviceDate: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  tourTypes: MyReservationLine[];
  tours: MyReservationLine[];
  extras: MyReservationExtraLine[];
  paymentSummary: MyPaymentSummary | null;
  transactions: MyTransaction[];
};

export type MyReview = {
  reviewId: string;
  productId: string;
  productType: "TOUR" | "TOURTYPE" | "EXTRA";
  rating: number;
  comment: string | null;
  createdAt: string;
};

async function authedGet<T>(path: string, accessToken: string, fallback: T): Promise<T> {
  if (!BASE) return fallback;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function getMyReservations(accessToken: string): Promise<MyReservation[]> {
  return authedGet<MyReservation[]>("/reservations/my-reservations", accessToken, []);
}

export function getMyReviews(accessToken: string): Promise<{ content: MyReview[] }> {
  return authedGet<{ content: MyReview[] }>("/reviews/mine", accessToken, { content: [] });
}

export async function createMyReview(
  accessToken: string,
  input: { productId: string; productType: "TOUR" | "TOURTYPE" | "EXTRA"; rating: number; comment: string },
): Promise<WriteResult<MyReview>> {
  if (!BASE) return { ok: false, message: "Accounts aren't connected yet." };
  try {
    const res = await fetch(`${BASE}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data as MyReview };
    return { ok: false, message: (data as { message?: string }).message ?? "Could not submit the review." };
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}
