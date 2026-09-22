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
import { site } from "@/lib/site";
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
  Tour,
  TourBooking,
  TourBookingInput,
} from "@/lib/types";
import type { SlotAvailability } from "@/lib/bookings";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

// ── Fail closed (production-hardening item 3) ──────────────────────────────
//
// Serving seed/placeholder content as though it were live business data — stale
// marketing prices, a fabricated catalogue — is only ever acceptable as a
// deliberate LOCAL convenience. So it is OFF by default and must be opted into
// explicitly:
//
//     ALLOW_SEED_FALLBACK=true              # server-side (dev only)
//     NEXT_PUBLIC_ALLOW_SEED_FALLBACK=true  # if a client component needs it too
//
// With the opt-in OFF (every real deployment, and any build/CI that forgot to
// set it):
//   • NEXT_PUBLIC_API_URL missing  → hard error at first call. `next build`
//     fails, `next start` fails on first request. No silent seed site ships.
//   • a configured backend errors  → `console.error`, then the caller's neutral
//     "unavailable" value (empty list / null). NEVER seed data.
//
// This does not depend on anyone remembering to set a production flag: the
// unsafe path requires an explicit opt-in, the safe path is the default.
const SEED_FALLBACK_ENABLED =
  process.env.ALLOW_SEED_FALLBACK === "true" ||
  process.env.NEXT_PUBLIC_ALLOW_SEED_FALLBACK === "true";

/** Thrown when no backend is configured and seed fallback was not opted into. */
export class MisconfiguredBackendError extends Error {
  constructor(path: string) {
    super(
      `NEXT_PUBLIC_API_URL is not set and ALLOW_SEED_FALLBACK is not "true" — ` +
        `refusing to serve seed data for "${path}". Set NEXT_PUBLIC_API_URL to a real ` +
        `backend, or set ALLOW_SEED_FALLBACK=true for local development.`,
    );
    this.name = "MisconfiguredBackendError";
  }
}

/** True once a real backend is configured. */
export const usingRemoteApi = BASE !== "";

/** Test seam only — lets a test assert on the resolved config without reimporting. */
export const __config = { get seedFallbackEnabled() { return SEED_FALLBACK_ENABLED; }, get base() { return BASE; } };

/** Absolute URL for the backend, or a relative Next.js route when local. */
function url(path: string): string {
  return BASE ? `${BASE}${path}` : `/api${path}`;
}

/** `?locale=de` for the real backend's public catalog endpoints; omitted for French/unset (its own fallback). */
function localeQuery(locale?: string): string {
  return locale && locale !== "fr" ? `?locale=${encodeURIComponent(locale)}` : "";
}

type FetchOpts = { revalidate?: number; signal?: AbortSignal };

/**
 * @param seed  value to serve ONLY when seed fallback is explicitly enabled
 * @param empty neutral "backend unavailable" value — served on a runtime failure
 *              when seed fallback is disabled (never the seed)
 */
async function get<T>(
  path: string,
  { seed, empty }: { seed: T; empty: T },
  opts: FetchOpts = {},
): Promise<T> {
  if (!BASE) {
    if (SEED_FALLBACK_ENABLED) return seed;
    throw new MisconfiguredBackendError(path);
  }

  try {
    const res = await fetch(url(path), {
      signal: opts.signal,
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    });
    if (!res.ok) {
      if (SEED_FALLBACK_ENABLED) return seed;
      console.error(`[lib/api] ${path} returned ${res.status} — serving unavailable state`);
      return empty;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (SEED_FALLBACK_ENABLED) return seed;
    console.error(`[lib/api] ${path} fetch failed — serving unavailable state`, err);
    return empty;
  }
}

/** For the `if (!BASE)` early returns: seed when opted in, else a hard config error. */
function seedOrThrow<T>(path: string, seed: T): T {
  if (SEED_FALLBACK_ENABLED) return seed;
  throw new MisconfiguredBackendError(path);
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
  if (!BASE) return seedOrThrow("getCmsPage", null);
  const loc = (locale ?? "fr").toUpperCase();
  return get<CmsPage | null>(
    `/public/pages/${encodeURIComponent(slug)}?locale=${loc}&companyType=DUNES_INSOLITES`,
    { seed: null, empty: null },
    { revalidate: 300 },
  );
}

/**
 * Every PUBLISHED "guide"-category page in one locale — powers the
 * vitrine's /guides index. `[]` for no backend configured, same
 * degrade-gracefully convention as getCmsPage: the two seed articles
 * (lib/guides.ts) are what the index falls back to showing on their own.
 */
export async function getGuidePages(locale?: string): Promise<CmsPage[]> {
  if (!BASE) return seedOrThrow("getGuidePages", []);
  const loc = (locale ?? "fr").toUpperCase();
  return get<CmsPage[]>(
    `/public/pages?category=GUIDE&locale=${loc}&companyType=DUNES_INSOLITES`,
    { seed: [], empty: [] },
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
  if (!BASE) return seedOrThrow("getRedirects", []);
  return get<CmsRedirect[]>("/public/redirects", { seed: [], empty: [] }, { revalidate: 300 });
}

export async function getNavigation(locale?: string): Promise<CmsNavItem[]> {
  if (!BASE) return seedOrThrow("getNavigation", []);
  const loc = (locale ?? "fr").toUpperCase();
  return get<CmsNavItem[]>(
    `/public/navigation?locale=${loc}&companyType=DUNES_INSOLITES`,
    { seed: [], empty: [] },
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
    { seed: { activities: seedActivities(locale) }, empty: { activities: [] } },
    { revalidate: 300 },
  );
  return data.activities ?? [];
}

export async function getActivity(slug: string, locale?: string): Promise<Activity | undefined> {
  if (!BASE) return seedOrThrow("getActivity", seedActivity(slug, locale));
  return get<Activity | undefined>(
    `/public/activities/${encodeURIComponent(slug)}${localeQuery(locale)}`,
    { seed: seedActivity(slug, locale), empty: undefined },
  );
}

export async function getRelatedActivities(slug: string, locale?: string): Promise<Activity[]> {
  if (!BASE) return seedOrThrow("getRelatedActivities", seedRelated(slug, locale));
  const all = await getActivities(locale);
  return all.filter((a) => a.slug !== slug);
}

export async function getStats(): Promise<Stats> {
  // Found live (UI/UX audit, 30 Aug 2026): same bug class as getReviews()
  // had - this called a bare "/stats", which is ReviewController's sibling
  // AUTHENTICATED endpoint on the real backend (401 for a visitor), so it
  // silently fell back to lib/data/stats.ts's hardcoded "4.9★" forever.
  // guestsGuided/yearsRunning come from the admin-editable SiteSettings
  // (15 Sep 2026: was "pending confirmation from the business owner" -
  // now the owner sets them directly from the backoffice), still falling
  // back to the same seed values on the same failure modes as every other
  // call in this file.
  //
  // avgRating: on request, 15 Sep 2026 — "the rating from Google, don't
  // invent one, that's fake". Prefers the REAL Google Business rating
  // (settings.googleRating, from Places API, cached server-side) over
  // this app's own internal review average, since a couple of in-app
  // reviews isn't what a visitor comparing against Google search results
  // expects to see. Falls back to the internal average only when no
  // Google Place ID is configured yet; undefined (shows a "New" label)
  // when neither exists - never a fabricated number either way.
  if (!usingRemoteApi) return seedOrThrow("getStats", seedStats);

  const [reviews, settings] = await Promise.all([getReviews(), getSiteSettings()]);
  const avgRating =
    settings.googleRating != null
      ? `${settings.googleRating.toFixed(1)}★`
      : reviews.length
        ? `${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}★`
        : undefined;

  return { guestsGuided: settings.guestsGuided, yearsRunning: settings.yearsRunning, avgRating };
}

/**
 * Business facts (contact info, social links, headline stats) the vitrine
 * used to hardcode in lib/site.ts and lib/data/stats.ts — admin-editable
 * since 15 Sep 2026 (SiteSettings). `site`'s own current values are both
 * the seed AND the "backend unavailable" fallback here (unlike catalog
 * data, they're real business facts already correct today, not
 * placeholder demo content) — see this file's own `get()` helper doc
 * above for the general seed/empty distinction.
 */
export type SiteSettingsData = {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  coords: { lat: number; lng: number };
  social: { label: string; href: string }[];
  guestsGuided: string;
  yearsRunning: string;
  /** The real Google Business rating (Places API) — null until configured/fetched, never invented. */
  googleRating: number | null;
  googleRatingCount: number | null;
  googlePlaceId: string | null;
};

export async function getSiteSettings(): Promise<SiteSettingsData> {
  const fallback: SiteSettingsData = {
    email: site.email,
    phone: site.phone,
    whatsapp: site.whatsapp,
    address: site.address,
    coords: site.coords,
    social: site.social,
    guestsGuided: seedStats.guestsGuided,
    yearsRunning: seedStats.yearsRunning,
    googleRating: null,
    googleRatingCount: null,
    googlePlaceId: null,
  };
  if (!BASE) return seedOrThrow("getSiteSettings", fallback);

  type RawSiteSettings = {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    guestsGuided: string;
    yearsRunning: string;
    googleRating: number | null;
    googleRatingCount: number | null;
    googlePlaceId: string | null;
  };
  const raw = await get<RawSiteSettings>(
    "/public/site-settings",
    { seed: null as unknown as RawSiteSettings, empty: null as unknown as RawSiteSettings },
    { revalidate: 300 },
  );
  if (!raw) return fallback;

  const social: { label: string; href: string }[] = [];
  if (raw.instagramUrl) social.push({ label: "Instagram", href: raw.instagramUrl });
  if (raw.facebookUrl) social.push({ label: "Facebook", href: raw.facebookUrl });
  if (raw.tiktokUrl) social.push({ label: "TikTok", href: raw.tiktokUrl });

  return {
    email: raw.email,
    phone: raw.phone,
    whatsapp: raw.whatsapp,
    address: raw.address,
    coords: { lat: raw.latitude ?? site.coords.lat, lng: raw.longitude ?? site.coords.lng },
    social: social.length > 0 ? social : site.social,
    guestsGuided: raw.guestsGuided,
    yearsRunning: raw.yearsRunning,
    googleRating: raw.googleRating,
    googleRatingCount: raw.googleRatingCount,
    googlePlaceId: raw.googlePlaceId,
  };
}

export async function getStays(locale?: string): Promise<Stay[]> {
  const data = await get<{ stays: Stay[] }>(
    `/public/stays${localeQuery(locale)}`,
    { seed: { stays: seedStays(locale) }, empty: { stays: [] } },
    { revalidate: 300 },
  );
  return data.stays ?? [];
}

export async function getStay(slug: string, locale?: string): Promise<Stay | undefined> {
  if (!BASE) return seedOrThrow("getStay", seedStay(slug, locale));
  return get<Stay | undefined>(
    `/public/stays/${encodeURIComponent(slug)}${localeQuery(locale)}`,
    { seed: seedStay(slug, locale), empty: undefined },
  );
}

export async function getRelatedStays(slug: string, locale?: string): Promise<Stay[]> {
  if (!BASE) return seedOrThrow("getRelatedStays", seedRelatedStays(slug, locale));
  const all = await getStays(locale);
  return all.filter((s) => s.slug !== slug);
}

/* ------------------------------------------------------ tours (circuits) */
// Route Insolite's product — published on the Dunes vitrine since 18 Sep
// 2026 (business owner, explicit; see docs/OPEN-QUESTIONS.md Q6's
// addendum). No curated seed content exists for Tours (unlike
// activities/stays' lib/data/*-i18n) — honest empty state when no backend
// is configured, same convention getRedirects/getNavigation use, rather
// than inventing placeholder circuits.

export async function getTours(locale?: string): Promise<Tour[]> {
  const data = await get<{ tours: Tour[] }>(
    `/public/tours${localeQuery(locale)}`,
    { seed: { tours: [] }, empty: { tours: [] } },
    { revalidate: 300 },
  );
  return data.tours ?? [];
}

export async function getTour(slug: string, locale?: string): Promise<Tour | undefined> {
  if (!BASE) return seedOrThrow("getTour", undefined);
  return get<Tour | undefined>(
    `/public/tours/${encodeURIComponent(slug)}${localeQuery(locale)}`,
    { seed: undefined, empty: undefined },
  );
}

export async function getRelatedTours(slug: string, locale?: string): Promise<Tour[]> {
  if (!BASE) return seedOrThrow("getRelatedTours", []);
  const all = await getTours(locale);
  return all.filter((t) => t.slug !== slug);
}

/* --------------------------------------------------- accommodation availability */

export type TierAvailability = {
  slug: string;
  name: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  unitsAvailable: number | null;
};
export type StayAvailability = {
  staySlug: string;
  date: string;
  nights: number;
  accommodations: TierAvailability[];
};

/**
 * Truthful accommodation availability across [date, date + nights) (Phase 2).
 * `nights` defaults to 1 server-side when omitted. Advisory — the booking
 * call re-checks the same range under a lock. Returns `null` when there's no
 * backend (local dev): the form then treats every tier as bookable, same as
 * before.
 */
export async function getStayAvailability(
  slug: string,
  date: string,
  nights?: number,
  signal?: AbortSignal,
): Promise<StayAvailability | null> {
  if (!BASE) return null;
  const nightsQuery = nights && nights > 1 ? `&nights=${nights}` : "";
  return get<StayAvailability | null>(
    `/public/stays/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}${nightsQuery}`,
    { seed: null, empty: null },
    { signal },
  );
}

export type ActivityAvailability = {
  activitySlug: string;
  date: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  unitsAvailable: number | null;
};

/**
 * Truthful activity capacity (quads, camel-ride seats...) for one day.
 * Advisory — the booking call re-checks under a lock. Returns `null` when
 * there's no backend (local dev): the form then treats the activity as
 * bookable with no cap, same convention as getStayAvailability.
 */
export async function getActivityAvailability(
  slug: string,
  date: string,
  signal?: AbortSignal,
): Promise<ActivityAvailability | null> {
  if (!BASE) return null;
  return get<ActivityAvailability | null>(
    `/public/activities/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`,
    { seed: null, empty: null },
    { signal },
  );
}

/* ------------------------------------------------- guide & transport options */

export type ServiceOptionCategory = "GUIDE" | "TRANSPORT";
export type PricingUnit = "PER_DAY" | "PER_BOOKING" | "PER_PERSON" | "PER_VEHICLE";
export type PickupField = "HOTEL_NAME" | "AIRPORT" | "FLIGHT_NUMBER" | "ADDRESS" | "ARRIVAL_TIME" | "INSTRUCTIONS";

/** The catalogue shape for the "Getting There & Guide" step - real price, never invented client-side. */
export type ServiceOptionCatalogItem = {
  slug: string;
  name: string;
  description: string | null;
  category: ServiceOptionCategory;
  type: string;
  pricingUnit: PricingUnit;
  priceTtc: number | null;
  requiresPickupLocation: boolean;
  requiresCustomerVehicle: boolean;
  pickupFields: PickupField[];
  requiredPickupFields: PickupField[];
};

/** Empty array on any failure (no backend, network error...) - the step degrades to "no options available". */
export async function getServiceOptions(category?: ServiceOptionCategory): Promise<ServiceOptionCatalogItem[]> {
  if (!BASE) return [];
  const qs = category ? `?category=${category}` : "";
  const data = await get<{ serviceOptions: ServiceOptionCatalogItem[] }>(
    `/public/service-options${qs}`,
    { seed: { serviceOptions: [] }, empty: { serviceOptions: [] } },
    { revalidate: 300 },
  );
  return data.serviceOptions ?? [];
}

/** An admin-managed language (SpokenLanguage) - not a hardcoded FR/EN/AR
 *  set, since real guides speak German, Italian, etc. Used by the Tour
 *  booking form's "preferred language" step. */
export type Language = { id: string; name: string };

/** Empty array on any failure - the step degrades to a free-text "other language" field only. */
export async function getLanguages(signal?: AbortSignal): Promise<Language[]> {
  if (!BASE) return [];
  const data = await get<{ languageId: string; name: string }[]>(
    "/public/languages",
    { seed: [], empty: [] },
    { revalidate: 300, signal },
  );
  return data.map((l) => ({ id: l.languageId, name: l.name }));
}

export type ServiceOptionAvailability = {
  serviceOptionSlug: string;
  date: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  unitsAvailable: number | null;
};

/** Advisory — the booking call re-checks under a lock. Returns `null` when there's no backend. */
export async function getServiceOptionAvailability(
  slug: string,
  date: string,
  signal?: AbortSignal,
): Promise<ServiceOptionAvailability | null> {
  if (!BASE) return null;
  return get<ServiceOptionAvailability | null>(
    `/public/service-options/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`,
    { seed: null, empty: null },
    { signal },
  );
}

export async function getGallery(): Promise<GalleryItem[]> {
  return get<GalleryItem[]>(
    "/public/gallery",
    { seed: seedGallery, empty: [] },
    { revalidate: 600 },
  );
}

/** The five-tile strip on the landing page, not the full gallery. */
export async function getGalleryStrip(): Promise<GalleryItem[]> {
  if (!BASE) return seedOrThrow("getGalleryStrip", seedStrip);
  const all = await getGallery();
  return all.slice(0, 5);
}

export async function getReviews(filter?: {
  activitySlug?: string;
  staySlug?: string;
  tourSlug?: string;
}): Promise<Review[]> {
  const params = new URLSearchParams();
  if (filter?.activitySlug) params.set("activity", filter.activitySlug);
  if (filter?.staySlug) params.set("stay", filter.staySlug);
  if (filter?.tourSlug) params.set("tour", filter.tourSlug);
  const qs = params.toString();
  // usingRemoteApi, not a bare "/reviews" - found live (UI/UX audit, 30 Aug
  // 2026): this used to hit the same path in both modes, which against the
  // real backend is ReviewController's own AUTHENTICATED endpoint (401 for
  // an anonymous visitor). get()'s catch-a-transient-failure fallback then
  // silently served lib/data/reviews.ts's explicitly-fake placeholder
  // content - permanently, not transiently, since the real public endpoint
  // never existed. The vitrine was serving fabricated reviews to every real
  // visitor. PublicReviewController now exists at the real path below.
  const base = usingRemoteApi ? "/public/reviews" : "/reviews";
  const path = qs ? `${base}?${qs}` : base;

  // Seed reviews are served ONLY when seed fallback is explicitly enabled
  // (local dev). A stay page also carries general (untagged) reviews; activity
  // pages stay narrowly filtered to that one ride.
  const seed = filter?.activitySlug
    ? seedReviews.filter((r) => r.activitySlug === filter.activitySlug)
    : filter?.staySlug
      ? seedReviews.filter((r) => r.staySlug === filter.staySlug || (!r.staySlug && !r.activitySlug))
      : seedReviews;

  const data = await get<{ reviews: Review[] }>(
    path,
    { seed: { reviews: seed }, empty: { reviews: [] } },
    { revalidate: 600 },
  );
  return data.reviews ?? [];
}

export async function getAvailability(
  activity: string,
  date: string,
  signal?: AbortSignal,
): Promise<SlotAvailability[]> {
  const path = `/availability?activity=${encodeURIComponent(activity)}&date=${encodeURIComponent(date)}`;
  const data = await get<{ slots: SlotAvailability[] }>(
    path,
    { seed: { slots: [] }, empty: { slots: [] } },
    { signal },
  );
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
      message: (data as { error?: string; message?: string }).error
        ?? (data as { message?: string }).message,
    };
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}

export function createBooking(input: BookingInput): Promise<WriteResult<Booking>> {
  return postSameOrigin<Booking>("/bookings", input);
}

export function createStayBooking(
  input: StayBookingInput,
): Promise<WriteResult<StayBooking>> {
  return postSameOrigin<StayBooking>("/stay-bookings", input);
}

export function createTourBooking(
  input: TourBookingInput,
): Promise<WriteResult<TourBooking>> {
  return postSameOrigin<TourBooking>("/tour-bookings", input);
}

/** Booking writes use the Next BFF so its httpOnly session can be forwarded. */
async function postSameOrigin<T>(path: string, body: unknown): Promise<WriteResult<T>> {
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
      message: (data as { error?: string; message?: string }).error
        ?? (data as { message?: string }).message,
    };
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}

// Real backend has these under /public/contact and /public/subscribe
// (PublicContactController/PublicNewsletterController - SEO/vitrine audit
// fix: both used to be a local route-handler stand-in that validated the
// input and threw it away). Same usingRemoteApi branch createBooking above
// uses, for the same reason: the local stub keeps the shorter path.
export function sendContact(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<WriteResult<{ ok: true }>> {
  return post<{ ok: true }>(usingRemoteApi ? "/public/contact" : "/contact", input);
}

// `position` is the real, current subscriber count returned by the backend
// (NewsletterSubscribeResponse) — used for a "you're #N on the list" touch
// on request. Optional so callers that don't need it (the footer's
// Newsletter.tsx) aren't forced to handle it.
export function subscribe(email: string): Promise<WriteResult<{ position?: number }>> {
  return post<{ position?: number }>(usingRemoteApi ? "/public/subscribe" : "/subscribe", { email });
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
  acceptedTerms: boolean;
}): Promise<WriteResult<AuthUser>> {
  return postLocal<AuthUser>("/auth/register", input);
}

export function logout(): Promise<void> {
  return fetch("/api/auth/logout", { method: "POST" }).then(() => undefined);
}

/**
 * None of these three set a session cookie, so - unlike login/register -
 * they go straight to the real backend via post(), the same direct-to-API
 * path sendContact()/subscribe() already use, rather than through a
 * same-origin BFF route handler.
 */
export function requestPasswordReset(email: string): Promise<WriteResult<{ ok: true }>> {
  return post<{ ok: true }>("/auth/forgot-password", { email });
}

export function resetPassword(token: string, newPassword: string): Promise<WriteResult<{ ok: true }>> {
  return post<{ ok: true }>("/auth/reset-password", { token, newPassword });
}

export function verifyEmail(token: string): Promise<WriteResult<{ ok: true }>> {
  return post<{ ok: true }>("/auth/verify-email", { token });
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

// Ad-hoc staff attached to a TOURS reservation by an admin (Guide.java /
// Chauffeur.java) - not the customer's own booking-time guide/transport
// selection, which lives in `extras` instead. Read-only here: the client
// sees who was assigned, never assigns anyone themselves.
export type MyReservationStaffMember = {
  guideId?: string;
  chauffeurId?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
};

export type MyReservation = {
  reservationId: string;
  reservationType: string;
  status: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  serviceDate: string | null;
  arrivalMode: "OWN_VEHICLE" | "TRANSPORT" | null;
  // The real backend (ReservationResponse) already returns these on this
  // exact endpoint - this type just never declared them. Not new data,
  // just finally typed: needed for a real "N guests" line on the trip
  // overview instead of omitting it.
  numberOfAdults: number | null;
  numberOfChildren: number | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  tourTypes: MyReservationLine[];
  tours: MyReservationLine[];
  extras: MyReservationExtraLine[];
  paymentSummary: MyPaymentSummary | null;
  transactions: MyTransaction[];
  guides: MyReservationStaffMember[];
  chauffeurs: MyReservationStaffMember[];
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

// The driver portal's own view - a CHAUFFEUR-role account's assigned trips
// (DriverTripResponse), never a reservation's full pricing/guest detail.
export type MyDriverTrip = {
  reservationId: string;
  chauffeurId: string;
  tourName: string;
  serviceDate: string | null;
  groupName: string | null;
  groupLeaderName: string | null;
  numberOfAdults: number | null;
  numberOfChildren: number | null;
  status: string;
};

export function getMyTrips(accessToken: string): Promise<MyDriverTrip[]> {
  return authedGet<MyDriverTrip[]>("/chauffeurs/my-trips", accessToken, []);
}

// GET /reservations/{id} is ownership-scoped server-side (requireStaffOrOwner
// in ReservationServiceImpl) - a CLIENT gets their own reservation or a 403,
// never someone else's, so no extra check is needed here.
export function getMyReservationById(accessToken: string, reservationId: string): Promise<MyReservation | null> {
  return authedGet<MyReservation | null>(`/reservations/${reservationId}`, accessToken, null);
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

/* ------------------------------------------------------------ notifications */

export type MyNotification = {
  notificationId: string;
  reservationId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function getMyNotifications(accessToken: string): Promise<MyNotification[]> {
  return authedGet<MyNotification[]>("/notifications", accessToken, []);
}

export function getUnreadNotificationCount(accessToken: string): Promise<number> {
  return authedGet<number>("/notifications/unread-count", accessToken, 0);
}

async function authedMutate(path: string, accessToken: string, method: "PATCH" | "DELETE"): Promise<boolean> {
  if (!BASE) return false;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function markNotificationRead(accessToken: string, notificationId: string): Promise<boolean> {
  return authedMutate(`/notifications/${notificationId}/read`, accessToken, "PATCH");
}

export function markAllNotificationsRead(accessToken: string): Promise<boolean> {
  return authedMutate("/notifications/read-all", accessToken, "PATCH");
}

export function deleteNotification(accessToken: string, notificationId: string): Promise<boolean> {
  return authedMutate(`/notifications/${notificationId}`, accessToken, "DELETE");
}
