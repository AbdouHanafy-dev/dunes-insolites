"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "di-cookie-choice";
/** Sentinel used until the client has actually read localStorage. */
const PENDING = "pending";

let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string {
  try {
    // Treat blocked storage as "already answered" rather than nagging forever.
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "blocked";
  }
}

/** Server and hydration render: stay silent so nothing flashes. */
function getServerSnapshot(): string {
  return PENDING;
}

export default function CookieConsent() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(value: "all" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* nothing we can do */
    }
    listeners.forEach((l) => l());
  }

  if (choice !== "") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      style={{
        position: "fixed",
        left: 20,
        bottom: 20,
        // Pinned left rather than centred so it never sits on top of the
        // centred CTAs on the hero and CTA bands.
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
        We use one cookie to remember this choice. Nothing else, no ad trackers.{" "}
        <Link href="/legal/privacy" style={{ textDecoration: "underline" }}>
          Privacy policy
        </Link>
        .
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button className="header-cta" onClick={() => choose("all")}>
          Fine by me
        </button>
        <button
          className="header-cta"
          onClick={() => choose("essential")}
          style={{
            background: "transparent",
            border: "1px solid rgba(253,241,225,.42)",
            boxShadow: "none",
          }}
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
