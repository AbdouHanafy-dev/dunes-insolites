"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { MAX_PARTY_SIZE, type Accommodation, type Activity, type Stay } from "@/lib/types";

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/**
 * The reservation half of a stay's `.book-panel`. One form: stay date,
 * party size, contact details, and — the reason this exists as its own
 * component rather than a copy of the old tour form — checkboxes to add
 * any of the camp's real activities. No hour picker: which slot each ride
 * runs is confirmed with the guest on arrival, not chosen here.
 */
export default function StayReservationForm({
  stay,
  activities,
  accommodations,
  initialAccommodationSlug,
}: {
  stay: Stay;
  activities: Activity[];
  accommodations?: Accommodation[];
  initialAccommodationSlug?: string;
}) {
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [accommodationSlug, setAccommodationSlug] = useState(initialAccommodationSlug ?? "");
  const [accommodationQty, setAccommodationQty] = useState(1);
  const [rideSlugs, setRideSlugs] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  const min = todayISO();
  const partySize = adults + children;
  const selectedAccommodation = accommodations?.find((a) => a.slug === accommodationSlug);
  // Per unit while a specific tent/room/suite is chosen — how many units count
  // against a shared night's price is still to be confirmed with the camp, so
  // this stays a free pick rather than something derived from party size.
  const total = selectedAccommodation
    ? selectedAccommodation.priceFrom * accommodationQty
    : stay.priceFrom * partySize;

  function toggleRide(slug: string) {
    setRideSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function changeGuests(kind: "adults" | "children", change: -1 | 1) {
    if (kind === "adults") {
      setAdults((current) => Math.max(1, Math.min(MAX_PARTY_SIZE - children, current + change)));
      return;
    }
    setChildren((current) => Math.max(0, Math.min(MAX_PARTY_SIZE - adults, current + change)));
  }

  function changeAccommodationQty(change: -1 | 1) {
    setAccommodationQty((current) => Math.max(1, Math.min(6, current + change)));
  }

  function selectAccommodation(slug: string) {
    setAccommodationSlug(slug);
    setAccommodationQty(1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");

    const result = await api.createStayBooking({
      staySlug: stay.slug,
      accommodationSlug: accommodationSlug || undefined,
      accommodationQty: accommodationSlug ? accommodationQty : undefined,
      date,
      partySize,
      rideSlugs,
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(
        result.errors ? "" : (result.message ?? "We couldn't reserve that. Try again."),
      );
      setSubmitting(false);
      return;
    }

    setBooking(result.data);
    setSubmitting(false);
  }

  if (booking) {
    const rideNames = activities
      .filter((a) => rideSlugs.includes(a.slug))
      .map((a) => a.title);
    return (
      <div className="alert ok" style={{ marginTop: 0 }}>
        <strong>Reserved — {booking.id}.</strong> Nothing is charged now. We hold your spot and
        confirm by email or WhatsApp within a day
        {rideNames.length > 0 && (
          <>
            {" "}
            — we&apos;ll also sort out timing for {rideNames.join(", ")} once you arrive.
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="reserve-form">
      {accommodations && accommodations.length > 0 && (
        <div className="field" data-invalid={!!errors.accommodationSlug}>
          <label>Choose your camp</label>
          <div className="ride-options">
            {accommodations.map((a) => (
              <label key={a.slug} className="ride-option">
                <input
                  type="radio"
                  name="accommodation"
                  checked={accommodationSlug === a.slug}
                  onChange={() => selectAccommodation(a.slug)}
                />
                <span>{a.title}</span>
                <span className="ride-price">from €{a.priceFrom}</span>
              </label>
            ))}
          </div>
          {errors.accommodationSlug && <span className="err">{errors.accommodationSlug}</span>}
          {selectedAccommodation && (
            <div className="guest-picker" style={{ marginTop: 10 }}>
              <div className="guest-row">
                <div>
                  <strong>How many {selectedAccommodation.title.toLowerCase()}s?</strong>
                  <span>Exact rule to be confirmed with the camp — pick what you need for now</span>
                </div>
                <div className="guest-stepper">
                  <button
                    type="button"
                    onClick={() => changeAccommodationQty(-1)}
                    disabled={accommodationQty === 1}
                    aria-label={`Remove one ${selectedAccommodation.title.toLowerCase()}`}
                  >
                    −
                  </button>
                  <output aria-label={`${accommodationQty} ${selectedAccommodation.title.toLowerCase()}s`}>
                    {accommodationQty}
                  </output>
                  <button
                    type="button"
                    onClick={() => changeAccommodationQty(1)}
                    disabled={accommodationQty === 6}
                    aria-label={`Add one ${selectedAccommodation.title.toLowerCase()}`}
                  >
                    +
                  </button>
                </div>
              </div>
              {errors.accommodationQty && <span className="err">{errors.accommodationQty}</span>}
            </div>
          )}
        </div>
      )}

      <div className="field" data-invalid={!!errors.date}>
        <label htmlFor="s-date">Arrival date</label>
        <input
          id="s-date"
          type="date"
          min={min}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {errors.date && <span className="err">{errors.date}</span>}
      </div>

      <div className="field" data-invalid={!!errors.partySize}>
        <label>Who&apos;s coming?</label>
        <div className="guest-picker">
          <div className="guest-row">
            <div><strong>Adults</strong><span>Ages 7+</span></div>
            <div className="guest-stepper">
              <button type="button" onClick={() => changeGuests("adults", -1)} disabled={adults === 1} aria-label="Remove one adult">−</button>
              <output aria-label={`${adults} adults`}>{adults}</output>
              <button type="button" onClick={() => changeGuests("adults", 1)} disabled={partySize === MAX_PARTY_SIZE} aria-label="Add one adult">+</button>
            </div>
          </div>
          <div className="guest-row">
            <div><strong>Children</strong><span>Ages 6 and under</span></div>
            <div className="guest-stepper">
              <button type="button" onClick={() => changeGuests("children", -1)} disabled={children === 0} aria-label="Remove one child">−</button>
              <output aria-label={`${children} children`}>{children}</output>
              <button type="button" onClick={() => changeGuests("children", 1)} disabled={partySize === MAX_PARTY_SIZE} aria-label="Add one child">+</button>
            </div>
          </div>
        </div>
        {errors.partySize && <span className="err">{errors.partySize}</span>}
      </div>

      <div className="field" data-invalid={!!errors.rideSlugs}>
        <label>Add a ride? (optional)</label>
        <div className="ride-options">
          {activities.map((a) => (
            <label key={a.slug} className="ride-option">
              <input
                type="checkbox"
                checked={rideSlugs.includes(a.slug)}
                onChange={() => toggleRide(a.slug)}
              />
              <span>{a.title}</span>
              <span className="ride-price">from €{a.priceFrom}</span>
            </label>
          ))}
        </div>
        <p className="hint">
          We confirm the exact time for each with you once you&apos;re on-site.
        </p>
        {errors.rideSlugs && <span className="err">{errors.rideSlugs}</span>}
      </div>

      <div className="field" data-invalid={!!errors.name}>
        <label htmlFor="s-name">Full name</label>
        <input
          id="s-name"
          value={name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <span className="err">{errors.name}</span>}
      </div>

      <div className="field" data-invalid={!!errors.email}>
        <label htmlFor="s-email">Email</label>
        <input
          id="s-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>

      <div className="field" data-invalid={!!errors.phone}>
        <label htmlFor="s-phone">Phone</label>
        <input
          id="s-phone"
          type="tel"
          value={phone}
          autoComplete="tel"
          onChange={(e) => setPhone(e.target.value)}
        />
        {errors.phone && <span className="err">{errors.phone}</span>}
      </div>

      <div className="field">
        <label htmlFor="s-notes">Anything we should know? (optional)</label>
        <input
          id="s-notes"
          placeholder="Dietary needs, arrival time…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="summary">
        <div className="row total">
          <span>Total</span>
          <span>€{total}</span>
        </div>
      </div>

      {formError && <div className="alert">{formError}</div>}

      <button type="submit" className="btn-accent" disabled={submitting}>
        {submitting ? "Reserving…" : "Reserve this stay"}
      </button>
      <p className="note">Free cancellation up to 48 hours before arrival.</p>
    </form>
  );
}
