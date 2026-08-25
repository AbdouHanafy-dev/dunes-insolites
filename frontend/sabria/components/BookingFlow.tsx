"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { formatDuration } from "@/lib/data/activities";
import type { SlotAvailability } from "@/lib/bookings";
import { MAX_PARTY_SIZE, SLOT_LABELS, type Activity, type TimeSlot } from "@/lib/types";

const STEPS = ["Adventure", "Date & time", "Your details", "Review"] as const;

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function prettyDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingFlow({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const params = useSearchParams();

  // Deep link: /book?activity=quad-safari opens straight on the date step.
  const preset = params.get("activity");
  const presetSlug = preset && activities.some((a) => a.slug === preset) ? preset : "";

  const [step, setStep] = useState(presetSlug ? 1 : 0);
  const [slug, setSlug] = useState<string>(presetSlug);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot | "">("");
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Availability is cached against the (activity, date) pair it was fetched
  // for, so a stale response can never be shown against a newer selection.
  const [fetched, setFetched] = useState<{ key: string; slots: SlotAvailability[] }>({
    key: "",
    slots: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const activity = useMemo(() => activities.find((a) => a.slug === slug), [activities, slug]);
  const min = todayISO();

  const key = slug && date ? `${slug}|${date}` : "";
  const slots = fetched.key === key ? fetched.slots : [];
  const loadingSlots = key !== "" && fetched.key !== key;

  useEffect(() => {
    if (!key) return;
    const [a, d] = key.split("|");
    let cancelled = false;
    api
      .getAvailability(a, d)
      .then((slots) => !cancelled && setFetched({ key, slots }))
      .catch(() => !cancelled && setFetched({ key, slots: [] }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const total = activity ? activity.priceFrom * partySize : 0;
  const selectedSlot = slots.find((s) => s.slot === timeSlot);
  // A slot picked before the date changed stops counting once the new
  // availability says it is gone.
  const chosenSlot: TimeSlot | "" = selectedSlot?.available ? timeSlot : "";

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (step === 0 && !slug) e.activitySlug = "Pick an adventure to continue.";
    if (step === 1) {
      if (!date) e.date = "Pick a date.";
      else if (date < min) e.date = "Pick today or a future date.";
      if (!chosenSlot) e.timeSlot = "Pick a time slot.";
      else if (selectedSlot && selectedSlot.seatsLeft < partySize)
        e.partySize = `Only ${selectedSlot.seatsLeft} seat${selectedSlot.seatsLeft === 1 ? "" : "s"} left in that slot.`;
      if (partySize < 1 || partySize > MAX_PARTY_SIZE)
        e.partySize = `Party size must be between 1 and ${MAX_PARTY_SIZE}.`;
    }
    if (step === 2) {
      if (!name.trim()) e.name = "We need a name for the booking.";
      if (!email.trim()) e.email = "We need an email for the confirmation.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "That email looks off.";
      if (!phone.trim()) e.phone = "A phone number, in case plans change.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [step, slug, date, min, chosenSlot, selectedSlot, partySize, name, email, phone]);

  function next() {
    if (validateStep()) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitting(true);
    setFormError("");

    const result = await api.createBooking({
      activitySlug: slug,
      date,
      timeSlot: chosenSlot as TimeSlot,
      partySize,
      name,
      email,
      phone,
      notes,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(
        result.errors
          ? "Some details need another look — check the steps above."
          : (result.message ?? "We couldn't save that booking. Try again."),
      );
      setSubmitting(false);
      return;
    }

    // Keep a local copy so the confirmation page still renders if the
    // booking store is cold (e.g. after a server restart).
    try {
      sessionStorage.setItem(`booking:${result.data.id}`, JSON.stringify(result.data));
    } catch {
      /* storage unavailable — the API lookup still works */
    }
    router.push(`/bookings/${result.data.id}`);
  }

  return (
    <>
      <div className="stepper">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className="s"
            data-state={i === step ? "active" : i < step ? "done" : "todo"}
          >
            0{i + 1} · {label}
          </span>
        ))}
      </div>

      <div className="book-card">
        {/* ---------- 1. adventure ---------- */}
        {step === 0 && (
          <>
            <h2>Which adventure?</h2>
            <p className="hint">Pick one to start. You can add another trip after checkout.</p>
            <div className="picker">
              {activities.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  className="pick"
                  aria-pressed={slug === a.slug}
                  onClick={() => setSlug(a.slug)}
                >
                  <div className="thumb">
                    <Image src={a.cardImage} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />
                  </div>
                  <div className="meta">
                    <h3>{a.title}</h3>
                    <p>{a.tagline}</p>
                    <span className="price">
                      From €{a.priceFrom} · {formatDuration(a.durationMins)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {errors.activitySlug && <div className="alert">{errors.activitySlug}</div>}
          </>
        )}

        {/* ---------- 2. date + slot ---------- */}
        {step === 1 && (
          <>
            <h2>When are you coming?</h2>
            <p className="hint">
              {activity?.title} runs a morning departure and a golden-hour departure. Availability
              updates as you change the date.
            </p>

            <div className="form-grid">
              <div className="field" data-invalid={!!errors.date}>
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  min={min}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                {errors.date && <span className="err">{errors.date}</span>}
              </div>

              <div className="field" data-invalid={!!errors.partySize}>
                <label htmlFor="party">Party size</label>
                <select
                  id="party"
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                >
                  {Array.from({ length: MAX_PARTY_SIZE }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "person" : "people"}
                    </option>
                  ))}
                </select>
                {errors.partySize && <span className="err">{errors.partySize}</span>}
              </div>

              <div className="field span-2" data-invalid={!!errors.timeSlot}>
                <label>Departure</label>
                {!date && <p className="hint">Pick a date to see open slots.</p>}
                {date && loadingSlots && <p className="hint">Checking availability…</p>}
                {date && !loadingSlots && slots.length === 0 && (
                  <p className="hint">No departures that day. Try another date.</p>
                )}
                {date && !loadingSlots && slots.length > 0 && (
                  <div className="slots">
                    {slots.map((s) => (
                      <button
                        key={s.slot}
                        type="button"
                        className="slot"
                        aria-pressed={chosenSlot === s.slot}
                        disabled={!s.available}
                        onClick={() => setTimeSlot(s.slot)}
                      >
                        <span className="t">{SLOT_LABELS[s.slot]}</span>
                        <span className="s">
                          {s.available
                            ? `${s.seatsLeft} seat${s.seatsLeft === 1 ? "" : "s"} left`
                            : "Sold out"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {errors.timeSlot && <span className="err">{errors.timeSlot}</span>}
              </div>
            </div>
          </>
        )}

        {/* ---------- 3. contact ---------- */}
        {step === 2 && (
          <>
            <h2>Who&apos;s riding?</h2>
            <p className="hint">
              We only use these to confirm your trip and reach you if the weather turns.
            </p>
            <div className="form-grid">
              <div className="field" data-invalid={!!errors.name}>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span className="err">{errors.name}</span>}
              </div>
              <div className="field" data-invalid={!!errors.email}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <span className="err">{errors.email}</span>}
              </div>
              <div className="field" data-invalid={!!errors.phone}>
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && <span className="err">{errors.phone}</span>}
              </div>
              <div className="field">
                <label htmlFor="hotel">Hotel / pickup point (optional)</label>
                <input
                  id="hotel"
                  placeholder="Where should we collect you?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* ---------- 4. review ---------- */}
        {step === 3 && (
          <>
            <h2>Check it over.</h2>
            <p className="hint">
              Nothing is charged now. We hold the seats, email you a confirmation, and take payment
              at the gate or by secure link before the trip.
            </p>
            <div className="summary">
              <div className="row">
                <span className="k">Adventure</span>
                <span>{activity?.title}</span>
              </div>
              <div className="row">
                <span className="k">Date</span>
                <span>{prettyDate(date)}</span>
              </div>
              <div className="row">
                <span className="k">Departure</span>
                <span>{chosenSlot ? SLOT_LABELS[chosenSlot] : "—"}</span>
              </div>
              <div className="row">
                <span className="k">Party</span>
                <span>
                  {partySize} {partySize === 1 ? "person" : "people"}
                </span>
              </div>
              <div className="row">
                <span className="k">Name</span>
                <span>{name}</span>
              </div>
              <div className="row">
                <span className="k">Contact</span>
                <span>
                  {email} · {phone}
                </span>
              </div>
              {notes && (
                <div className="row">
                  <span className="k">Pickup</span>
                  <span>{notes}</span>
                </div>
              )}
              <div className="row total">
                <span>Total</span>
                <span>€{total}</span>
              </div>
            </div>
            {formError && <div className="alert">{formError}</div>}
          </>
        )}

        <div className="book-actions">
          {step > 0 && (
            <button type="button" className="btn-quiet" onClick={back} disabled={submitting}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-accent" onClick={next}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn-accent" onClick={submit} disabled={submitting}>
              {submitting ? "Reserving…" : "Confirm booking"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
