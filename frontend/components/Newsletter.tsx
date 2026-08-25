"use client";

import { useState } from "react";
import { subscribe } from "@/lib/api";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");

    const result = await subscribe(email);
    if (result.ok) {
      setState("done");
      setEmail("");
      return;
    }
    setError(result.errors?.email ?? result.message ?? "Something went wrong. Try again.");
    setState("error");
  }

  if (state === "done") {
    return (
      <p style={{ marginTop: 22, fontSize: ".95rem", color: "#f0a558" }}>
        You&apos;re on the list — we&apos;ll write when new dates open.
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
        Dune dispatch
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: "inherit",
            fontSize: ".92rem",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(253,241,225,.24)",
            background: "rgba(253,241,225,.06)",
            color: "var(--paper)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="header-cta"
          style={{ padding: "12px 18px" }}
        >
          {state === "sending" ? "…" : "Join"}
        </button>
      </div>
      {error && (
        <p style={{ marginTop: 8, fontSize: ".85rem", color: "#f0a558" }}>{error}</p>
      )}
    </form>
  );
}
