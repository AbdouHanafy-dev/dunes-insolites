"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { subscribe } from "@/lib/api";
import { trackFormSubmitted } from "@/lib/analytics";

export default function Newsletter() {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");

    const result = await subscribe(email);
    if (result.ok) {
      trackFormSubmitted("newsletter");
      setState("done");
      setEmail("");
      return;
    }
    setError(result.errors?.email ?? result.message ?? t("genericError"));
    setState("error");
  }

  if (state === "done") {
    return (
      <p style={{ marginTop: 22, fontSize: ".95rem", color: "var(--color-ember)" }}>
        {t("subscribed")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 22, maxWidth: 300 }}>
      <label
        htmlFor="newsletter-email"
        style={{
          display: "block",
          fontSize: ".72rem",
          letterSpacing: ".16em",
          textTransform: "uppercase",
          marginBottom: 10,
          opacity: 0.75,
        }}
      >
        {t("label")}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: "inherit",
            fontSize: ".92rem",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(36,27,23,.24)",
            background: "rgba(36,27,23,.04)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="header-cta"
          style={{ padding: "12px 18px" }}
        >
          {state === "sending" ? "…" : t("joinButton")}
        </button>
      </div>
      {error && (
        <p style={{ marginTop: 8, fontSize: ".85rem", color: "var(--color-ember)" }}>{error}</p>
      )}
    </form>
  );
}
