"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Catches a render/runtime error anywhere under a locale's page tree —
 * one broken page no longer takes the whole site down with a blank white
 * screen. Sits inside app/[locale]/, so Header/Footer/ToastProvider (all
 * declared in layout.tsx, the parent of this boundary) keep rendering;
 * only the page content itself is replaced. Must be "use client" — Next.js
 * requires it for error.tsx regardless of the rest of the tree.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorBoundary");

  useEffect(() => {
    // No analytics/Sentry wired up yet (ARCHITECTURE.md §13 — observability
    // limited to /actuator/health) - console.error is the only signal that
    // exists today, better than swallowing it silently.
    console.error(error);
  }, [error]);

  return (
    <section className="notfound">
      <div className="wrap">
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          {t("eyebrow")}
        </p>
        <p className="hero-sub" style={{ margin: "22px auto 0" }}>
          {t("body")}
        </p>
        <div className="hero-ctas">
          <button type="button" onClick={() => reset()} className="cta-primary">
            {t("retry")}
          </button>
          <Link href="/" className="cta-ghost">
            {t("home")}
          </Link>
        </div>
      </div>
    </section>
  );
}
