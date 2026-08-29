"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { subscribeToConsent, getConsentChoice, getConsentServerSnapshot } from "@/lib/consent";

/**
 * Loads GA4 (gtag.js) only when both are true:
 *   1. NEXT_PUBLIC_GA_MEASUREMENT_ID is set — never hardcoded (SEO/analytics
 *      audit rule: no ID in source). Unset in dev/preview by default, so
 *      this renders nothing there.
 *   2. The visitor has actually chosen "accept all" in CookieConsent - GA4
 *      sets a cross-session cookie, so it counts as non-essential under the
 *      same consent model that banner already enforces for everything else.
 *      Reads the same lib/consent.ts store the banner writes to, so
 *      accepting mid-session loads it immediately, no reload needed.
 *
 * See lib/analytics.ts for the actual event-tracking calls - this
 * component's only job is deciding whether gtag.js exists at all.
 */
export default function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const consent = useSyncExternalStore(subscribeToConsent, getConsentChoice, getConsentServerSnapshot);

  if (!measurementId || consent !== "all") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
          window.gtag = gtag;
        `}
      </Script>
    </>
  );
}
