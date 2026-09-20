"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { ActivityAvailability } from "@/lib/api";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import { formatDuration } from "@/lib/data/activities";
import { MAX_PARTY_SIZE, SLOT_LABELS, type Activity, type TimeSlot } from "@/lib/types";

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function prettyDate(iso: string, locale: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingFlow({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const locale = useLocale();
  const t = useTranslations("bookingFlow");
  const ta = useTranslations("auth");
  const STEPS = [t("stepAdventure"), t("stepDateTime"), t("stepYourDetails"), t("stepReview")] as const;

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const idempotencyKeyRef = useRef("");

  // Availability is cached against the (activity, date) pair it was fetched
  // for, so a stale response can never be shown against a newer selection.
  // Real capacity (quads, camel-ride seats...), not a per-time-slot mock -
  // the backend has no time-slot concept at all (the camp confirms the
  // hour on arrival), so `timeSlot` below is a plain preference, never
  // checked against capacity.
  const [fetched, setFetched] = useState<{ key: string; availability: ActivityAvailability | null }>({
    key: "",
    availability: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const activity = useMemo(() => activities.find((a) => a.slug === slug), [activities, slug]);
  const min = todayISO();

  const key = slug && date ? `${slug}|${date}` : "";
  const availability = fetched.key === key ? fetched.availability : null;
  const loadingAvailability = key !== "" && fetched.key !== key;
  const unitsAvailable = availability?.unitsAvailable ?? null;
  const soldOut = availability?.status === "UNAVAILABLE";

  useEffect(() => {
    if (!key) return;
    const [a, d] = key.split("|");
    let cancelled = false;
    api
      .getActivityAvailability(a, d)
      .then((availability) => {
        if (cancelled) return;
        setFetched({ key, availability });
        // Never let the party-size selector hold a value the guest could
        // not actually book once real capacity comes back lower than
        // their pick.
        const units = availability?.unitsAvailable ?? null;
        if (units != null) {
          setPartySize((current) => (current > units ? Math.max(1, units) : current));
        }
      })
      .catch(() => !cancelled && setFetched({ key, availability: null }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Display-only estimate — never submitted. createBooking sends slug, date,
  // slot, party and contact; the server computes the authoritative price.
  const total = activity ? activity.priceFrom * partySize : 0;
  const chosenSlot: TimeSlot | "" = timeSlot;

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (step === 0 && !slug) e.activitySlug = t("errorPickAdventure");
    if (step === 1) {
      if (!date) e.date = t("errorPickDate");
      else if (date < min) e.date = t("errorPastDate");
      if (!chosenSlot) e.timeSlot = t("errorPickTimeSlot");
      if (soldOut) e.partySize = t("errorSoldOut", { activity: activity?.title ?? "" });
      else if (unitsAvailable != null && unitsAvailable < partySize)
        e.partySize =
          unitsAvailable === 1
            ? t("errorLimitedSpotsOne", { n: unitsAvailable })
            : t("errorLimitedSpotsOther", { n: unitsAvailable });
      if (partySize < 1 || partySize > MAX_PARTY_SIZE)
        e.partySize = t("errorPartySizeRange", { max: MAX_PARTY_SIZE });
    }
    if (step === 2) {
      if (!name.trim()) e.name = t("errorName");
      if (!email.trim()) e.email = t("errorEmail");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t("errorEmailInvalid");
      if (!phone.trim()) e.phone = t("errorPhone");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [step, slug, date, min, chosenSlot, soldOut, unitsAvailable, activity, partySize, name, email, phone, t]);

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
    if (!acceptedTerms) {
      setErrors({ acceptedTerms: ta("termsRequired") });
      return;
    }
    setSubmitting(true);
    setFormError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    const result = await api.createBooking({
      activitySlug: slug,
      date,
      timeSlot: chosenSlot as TimeSlot,
      partySize,
      name,
      email,
      phone,
      notes,
      idempotencyKey: idempotencyKeyRef.current,
      acceptedTerms,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(
        result.errors ? t("errorFormSteps") : (result.message ?? t("errorGeneric")),
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
    toast.success(t("toastReserved", { id: result.data.id }));
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
            <h2>{t("adventureTitle")}</h2>
            <p className="hint">{t("adventureHint")}</p>
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
                      {t("fromPrice", { price: a.priceFrom, duration: formatDuration(a.durationMins) })}
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
            <h2>{t("dateTimeTitle")}</h2>
            <p className="hint">{t("dateTimeHint", { activity: activity?.title ?? "" })}</p>

            <div className="form-grid">
              <div className="field" data-invalid={!!errors.date}>
                <label htmlFor="date">{t("dateLabel")}</label>
                <DatePicker id="date" min={min} value={date} onChange={setDate} invalid={!!errors.date} />
                {errors.date && <span className="err">{errors.date}</span>}
              </div>

              <div className="field" data-invalid={!!errors.partySize}>
                <label htmlFor="party">{t("partySizeLabel")}</label>
                <select
                  id="party"
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                >
                  {Array.from(
                    { length: unitsAvailable != null ? Math.min(MAX_PARTY_SIZE, unitsAvailable) || 1 : MAX_PARTY_SIZE },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? t("personSingular") : t("peoplePlural")}
                    </option>
                  ))}
                </select>
                {!date && <p className="hint">{t("pickDateForAvailability")}</p>}
                {date && loadingAvailability && <p className="hint">{t("checkingAvailability")}</p>}
                {date && !loadingAvailability && soldOut && (
                  <p className="hint err">{t("fullyBookedTryAnother")}</p>
                )}
                {date && !loadingAvailability && !soldOut && unitsAvailable != null && (
                  <p className="hint">
                    {unitsAvailable === 1
                      ? t("spotsAvailableOne", { n: unitsAvailable })
                      : t("spotsAvailableOther", { n: unitsAvailable })}
                  </p>
                )}
                {errors.partySize && <span className="err">{errors.partySize}</span>}
              </div>

              <div className="field span-2" data-invalid={!!errors.timeSlot}>
                <label>{t("preferredDeparture")}</label>
                <div className="slots">
                  {(Object.keys(SLOT_LABELS) as TimeSlot[]).map((slotOption) => (
                    <button
                      key={slotOption}
                      type="button"
                      className="slot"
                      aria-pressed={chosenSlot === slotOption}
                      onClick={() => setTimeSlot(slotOption)}
                    >
                      <span className="t">{SLOT_LABELS[slotOption]}</span>
                    </button>
                  ))}
                </div>
                {errors.timeSlot && <span className="err">{errors.timeSlot}</span>}
              </div>
            </div>
          </>
        )}

        {/* ---------- 3. contact ---------- */}
        {step === 2 && (
          <>
            <h2>{t("contactTitle")}</h2>
            <p className="hint">{t("contactHint")}</p>
            <div className="form-grid">
              <div className="field" data-invalid={!!errors.name}>
                <label htmlFor="name">{t("fullName")}</label>
                <input
                  id="name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span className="err">{errors.name}</span>}
              </div>
              <div className="field" data-invalid={!!errors.email}>
                <label htmlFor="email">{t("emailLabel")}</label>
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
                <label htmlFor="phone">{t("phoneLabel")}</label>
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
                <label htmlFor="hotel">{t("hotelLabel")}</label>
                <input
                  id="hotel"
                  placeholder={t("hotelPlaceholder")}
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
            <h2>{t("reviewTitle")}</h2>
            <p className="hint">{t("reviewHint")}</p>
            <div className="summary">
              <div className="row">
                <span className="k">{t("adventureLabel")}</span>
                <span>{activity?.title}</span>
              </div>
              <div className="row">
                <span className="k">{t("dateLabelSummary")}</span>
                <span>{prettyDate(date, locale)}</span>
              </div>
              <div className="row">
                <span className="k">{t("departureLabel")}</span>
                <span>{chosenSlot ? SLOT_LABELS[chosenSlot] : "—"}</span>
              </div>
              <div className="row">
                <span className="k">{t("partyLabel")}</span>
                <span>
                  {partySize} {partySize === 1 ? t("personSingular") : t("peoplePlural")}
                </span>
              </div>
              <div className="row">
                <span className="k">{t("nameLabel")}</span>
                <span>{name}</span>
              </div>
              <div className="row">
                <span className="k">{t("contactLabel")}</span>
                <span>
                  {email} · {phone}
                </span>
              </div>
              {notes && (
                <div className="row">
                  <span className="k">{t("pickupLabel")}</span>
                  <span>{notes}</span>
                </div>
              )}
              <div className="row total">
                <span>{t("totalLabel")}</span>
                <span>€{total}</span>
              </div>
            </div>
            <label className="ride-option" data-invalid={!!errors.acceptedTerms}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                {ta("termsPre")}<Link href="/legal/terms">{ta("termsLinkTerms")}</Link>
                {ta("termsMid")}<Link href="/legal/privacy">{ta("termsLinkPrivacy")}</Link>{ta("termsPost")}
              </span>
            </label>
            {errors.acceptedTerms && <span className="err">{errors.acceptedTerms}</span>}
            {formError && <div className="alert">{formError}</div>}
          </>
        )}

        <div className="book-actions">
          {step > 0 && (
            <button type="button" className="btn-quiet" onClick={back} disabled={submitting}>
              ← {t("back")}
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-accent" onClick={next}>
              {t("continue")}
            </button>
          ) : (
            <button type="button" className="btn-accent" onClick={submit} disabled={submitting}>
              {submitting ? t("reserving") : t("confirmBooking")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
