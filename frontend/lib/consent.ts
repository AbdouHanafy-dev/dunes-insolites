/**
 * Cookie-consent storage + same-tab pub/sub, shared between
 * CookieConsent.tsx (the banner, which writes it) and Analytics.tsx (which
 * reads it to decide whether GA4 may load). Both used to need their own
 * copy of this; now there is exactly one, so a consent change from the
 * banner is visible to analytics in the same tab immediately, not just
 * after a reload or in other tabs (the native `storage` event only fires
 * cross-tab).
 */
export const CONSENT_KEY = "di-cookie-choice";
export type ConsentChoice = "" | "all" | "essential" | "blocked";
/** Sentinel used until the client has actually read localStorage. */
export const CONSENT_PENDING = "pending";

let listeners: Array<() => void> = [];

export function subscribeToConsent(cb: () => void) {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

export function getConsentChoice(): ConsentChoice {
  try {
    // Treat blocked storage as "already answered" rather than nagging forever.
    return (localStorage.getItem(CONSENT_KEY) as ConsentChoice) ?? "";
  } catch {
    return "blocked";
  }
}

/** Server and hydration render: stay silent so nothing flashes. */
export function getConsentServerSnapshot(): string {
  return CONSENT_PENDING;
}

export function setConsentChoice(value: "all" | "essential") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* nothing we can do */
  }
  listeners.forEach((l) => l());
}
