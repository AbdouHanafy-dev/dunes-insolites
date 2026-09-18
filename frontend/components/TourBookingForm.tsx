"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import * as api from "@/lib/api";
import { MAX_PARTY_SIZE } from "@/lib/types";
import { useToast } from "@/components/Toast";

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/**
 * Request-to-book form for a Tour (Route Insolite circuit) — no live
 * availability to check against (Tour has no capacity concept, see
 * PublicTourController's own comment), so this is simpler than
 * StayReservationForm/BookingFlow: date + party + contact, one screen.
 */
export default function TourBookingForm({ tourSlug, priceFrom }: { tourSlug: string; priceFrom: number }) {
  const t = useTranslations("tourBookingForm");
  const toast = useToast();

  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  const min = todayISO();
  const total = priceFrom * adults;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError("");

    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = t("errorPickDate");
    else if (date < min) newErrors.date = t("errorPastDate");
    if (adults < 1) newErrors.adults = t("errorAtLeastOneAdult");
    if (!name.trim()) newErrors.name = t("errorName");
    if (!email.trim()) newErrors.email = t("errorEmail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = t("errorEmailInvalid");
    if (!phone.trim()) newErrors.phone = t("errorPhone");
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    const result = await api.createTourBooking({
      tourSlug,
      date,
      numberOfAdults: adults,
      numberOfChildren: children,
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(result.errors ? "" : (result.message ?? t("errorGeneric")));
      setSubmitting(false);
      return;
    }

    setBooking(result.data);
    setSubmitting(false);
    toast.success(t("reservedConfirmation", { id: result.data.id }));
  }

  if (booking) {
    return (
      <div className="alert ok" style={{ marginTop: 0 }}>
        <strong>{t("reservedConfirmation", { id: booking.id })}</strong> {t("reservedBody")}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="reserve-form">
      <div className="field" data-invalid={!!errors.date}>
        <label htmlFor="t-date">{t("dateLabel")}</label>
        <input
          id="t-date"
          type="date"
          min={min}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {errors.date && <span className="err">{errors.date}</span>}
      </div>

      <div className="field" data-invalid={!!errors.adults}>
        <label htmlFor="t-adults">{t("adultsLabel")}</label>
        <input
          id="t-adults"
          type="number"
          min={1}
          max={MAX_PARTY_SIZE}
          value={adults}
          onChange={(e) => setAdults(Number(e.target.value))}
        />
        {errors.adults && <span className="err">{errors.adults}</span>}
      </div>

      <div className="field">
        <label htmlFor="t-children">{t("childrenLabel")}</label>
        <input
          id="t-children"
          type="number"
          min={0}
          max={MAX_PARTY_SIZE}
          value={children}
          onChange={(e) => setChildren(Number(e.target.value))}
        />
      </div>

      <div className="field" data-invalid={!!errors.name}>
        <label htmlFor="t-name">{t("fullName")}</label>
        <input id="t-name" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        {errors.name && <span className="err">{errors.name}</span>}
      </div>

      <div className="field" data-invalid={!!errors.email}>
        <label htmlFor="t-email">{t("email")}</label>
        <input
          id="t-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>

      <div className="field" data-invalid={!!errors.phone}>
        <label htmlFor="t-phone">{t("phone")}</label>
        <input id="t-phone" type="tel" value={phone} autoComplete="tel" onChange={(e) => setPhone(e.target.value)} />
        {errors.phone && <span className="err">{errors.phone}</span>}
      </div>

      <div className="field">
        <label htmlFor="t-notes">{t("notesLabel")}</label>
        <input
          id="t-notes"
          placeholder={t("notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="summary">
        <div className="row total">
          <span>{t("estimatedTotal")}</span>
          <span>€{total}</span>
        </div>
      </div>

      {formError && <div className="alert">{formError}</div>}

      <button type="submit" className="btn-accent" disabled={submitting}>
        {submitting ? t("reserving") : t("requestToBook")}
      </button>
      <p className="note">{t("noChargeNote")}</p>
    </form>
  );
}
