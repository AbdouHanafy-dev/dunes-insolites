"use client";

import { useState } from "react";
import { subscribe } from "@/lib/api";

/**
 * Self-contained, like MaintenanceCountdown.tsx — the maintenance page has
 * no next-intl context (see maintenance/layout.tsx's comment), so this
 * takes its labels as props rather than calling useTranslations. Posts
 * through the same `subscribe()` used by the footer's Newsletter.tsx — one
 * real subscriber list, not a second one just for this form.
 *
 * The success state's "you're #N on the list" line (on request, matching a
 * reference "coming soon" page) uses the real count the backend returns —
 * NewsletterSubscribeResponse.position — never a number made up here. The
 * local no-backend dev stand-in (app/api/subscribe/route.ts) has nowhere
 * to count from and omits it; this simply doesn't render that line then.
 */
export default function MaintenanceNotifyForm({
  labels,
}: {
  labels: {
    eyebrow: string;
    label: string;
    placeholder: string;
    consent: string;
    button: string;
    sending: string;
    doneHeading: string;
    doneBody: string;
    /** "You're #{n} on the list." — {n} is replaced with the real count. */
    donePosition: string;
    genericError: string;
  };
}) {
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | undefined>(undefined);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consented) return;
    setState("sending");
    setError("");
    const result = await subscribe(email);
    if (result.ok) {
      setPosition(result.data.position);
      setState("done");
      setEmail("");
      return;
    }
    setError(result.errors?.email ?? result.message ?? labels.genericError);
    setState("error");
  }

  if (state === "done") {
    return (
      <div className="maint-notify maint-notify-done">
        <span className="maint-notify-check" aria-hidden="true">
          ✓
        </span>
        <h2 className="display maint-notify-done-heading">{labels.doneHeading}</h2>
        <p className="maint-notify-done-body">{labels.doneBody}</p>
        {typeof position === "number" && (
          <p className="idx-label maint-notify-position">
            {labels.donePosition.replace("{n}", String(position))}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="maint-notify">
      <p className="idx-label maint-eyebrow">{labels.eyebrow}</p>
      <label htmlFor="maint-notify-email" className="maint-notify-label">
        {labels.label}
      </label>
      <div className="maint-notify-row">
        <input
          id="maint-notify-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={labels.placeholder}
          className="maint-notify-input"
        />
        <button type="submit" disabled={state === "sending" || !consented} className="btn-accent">
          {state === "sending" ? "…" : labels.button}
        </button>
      </div>
      <label className="maint-notify-consent">
        <input
          type="checkbox"
          required
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
        />
        <span>{labels.consent}</span>
      </label>
      {error && <p className="maint-notify-error">{error}</p>}
    </form>
  );
}
