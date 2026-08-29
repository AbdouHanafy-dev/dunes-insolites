/**
 * GA4 event helpers. Every call is a no-op until Analytics.tsx has actually
 * loaded gtag.js (consent given + NEXT_PUBLIC_GA_MEASUREMENT_ID set) — see
 * that component for why. Nothing here ever reads or hardcodes the
 * measurement ID itself; that lives only in the env var, only in
 * Analytics.tsx.
 *
 * Event names match the SEO/analytics audit's spec exactly, using GA4's own
 * recommended ecommerce event names where one exists (view_item,
 * select_item, begin_checkout, add_to_cart) rather than inventing
 * parallel ones — that's what makes GA4's own funnel/ecommerce reports
 * work without custom configuration.
 */

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export type CatalogItem = {
  id: string;
  name: string;
  category: "activity" | "stay";
  price: number;
  currency?: string;
};

function itemParams(item: CatalogItem) {
  return {
    currency: item.currency ?? "EUR",
    value: item.price,
    items: [{ item_id: item.id, item_name: item.name, item_category: item.category, price: item.price }],
  };
}

/** A stay's (nuitée) detail page was viewed. */
export function trackViewAccommodation(item: CatalogItem) {
  trackEvent("view_accommodation", itemParams(item));
  trackEvent("view_item", itemParams(item));
}

/** An activity/experience's detail page was viewed. */
export function trackViewExperience(item: CatalogItem) {
  trackEvent("view_experience", itemParams(item));
  trackEvent("view_item", itemParams(item));
}

/** A gallery/list filter or the (currently nonexistent) site search was used. */
export function trackSearch(searchTerm: string) {
  trackEvent("search", { search_term: searchTerm });
}

/** A card was clicked from a list (activities grid, related items, etc.). */
export function trackSelectItem(item: CatalogItem, listName: string) {
  trackEvent("select_item", { item_list_name: listName, ...itemParams(item) });
}

/** The booking flow was opened for a given item. */
export function trackBeginCheckout(item: CatalogItem) {
  trackEvent("begin_checkout", itemParams(item));
}

/** An extra/add-on was added inside the booking flow. */
export function trackAddToCart(item: CatalogItem) {
  trackEvent("add_to_cart", itemParams(item));
}

/** The booking form was submitted (a PENDING reservation request was sent). */
export function trackReservationStarted(item: CatalogItem) {
  trackEvent("reservation_started", itemParams(item));
}

/** Staff confirmed the reservation (call this from the confirmation page/email link, once wired). */
export function trackReservationConfirmed(item: CatalogItem, reservationId: string) {
  trackEvent("reservation_confirmed", { reservation_id: reservationId, ...itemParams(item) });
}

export function trackWhatsAppClick(context: string) {
  trackEvent("whatsapp_click", { link_context: context });
}

export function trackPhoneClick(context: string) {
  trackEvent("phone_click", { link_context: context });
}

export function trackFormSubmitted(formName: "contact" | "newsletter" | "booking") {
  trackEvent("form_submitted", { form_name: formName });
}
