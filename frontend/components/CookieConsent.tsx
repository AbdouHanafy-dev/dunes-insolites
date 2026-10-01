"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import {
  subscribeToConsent,
  getConsentChoice,
  getConsentServerSnapshot,
  setConsentChoice,
} from "@/lib/consent";

export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const choice = useSyncExternalStore(subscribeToConsent, getConsentChoice, getConsentServerSnapshot);

  function choose(value: "all" | "essential") {
    setConsentChoice(value);
  }

  if (choice !== "") return null;

  return (
    <div
      role="dialog"
      aria-label={t("dialogLabel")}
      style={{
        position: "fixed",
        insetInlineStart: 20,
        bottom: 20,
        // Pinned to the reading-start edge (flips under RTL) rather than
        // centred, so it never sits on top of the centred CTAs on the hero
        // and CTA bands.
        width: "min(420px, calc(100vw - 40px))",
        zIndex: 50,
        background: "rgba(20,14,10,.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(253,241,225,.16)",
        borderRadius: 18,
        padding: "22px 24px",
        color: "var(--paper)",
        boxShadow: "0 20px 60px rgba(8,5,3,.5)",
      }}
    >
      <p style={{ fontSize: ".95rem", lineHeight: 1.55, opacity: 0.88 }}>
        {t("body")}{" "}
        <Link href="/legal/privacy" style={{ textDecoration: "underline" }}>
          {t("privacyPolicy")}
        </Link>
        .
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button className="header-cta cookie-btn cookie-btn-primary" onClick={() => choose("all")}>
          {t("acceptAll")}
        </button>
        <button
          className="header-cta cookie-btn cookie-btn-essential"
          onClick={() => choose("essential")}
        >
          {t("essentialOnly")}
        </button>
      </div>
    </div>
  );
}
