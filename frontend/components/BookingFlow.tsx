"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { ActivityAvailability, Language } from "@/lib/api";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import { formatDuration } from "@/lib/data/activities";
import {
  DEPARTURE_CITIES,
  DEPARTURE_CITY_LABELS,
  MAX_PARTY_SIZE,
  SLOT_LABELS,
  type Activity,
  type DepartureCity,
  type TimeSlot,
} from "@/lib/types";

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

/**
 * Same "Date & travelers → Guide language → Vehicle → Extras → Review" wizard
 * as TourBookingFlow, with one step prepended (choose the activity) since
 * /book is the generic entry point across all activities rather than a
 * single activity's own detail page. Same backend shape too: arrivalMode,
 * departureCity, preferredLanguageIds and rideSlugs (other activities added
 * on top) all flow into the same Reservation pipeline as a Tour booking.
 */
export default function BookingFlow({ activities }: { activities: Activity[] }) {
  const params = useSearchParams();
  const toast = useToast();
  const locale = useLocale();
  const t = useTranslations("tourBookingForm");
  const tb = useTranslations("bookingFlow");
  const ta = useTranslations("authForm");

  const STEPS = [
    tb("stepAdventure"),
    t("stepDateTravelers"),
    t("stepGuide"),
    t("stepVehicle"),
    t("stepExtras"),
    t("stepReview"),
  ] as const;

  // Deep link: /book?activity=quad-safari opens straight on the date step.
  const preset = params.get("activity");
  const presetSlug = preset && activities.some((a) => a.slug === preset) ? preset : "";

  const [step, setStep] = useState(presetSlug ? 1 : 0);
  const [slug, setSlug] = useState<string>(presetSlug);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot | "">("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoaded, setLanguagesLoaded] = useState(false);
  const [preferredLanguageIds, setPreferredLanguageIds] = useState<string[]>([]);
  const [otherLanguageRequested, setOtherLanguageRequested] = useState("");

  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(null);
  const [departureCity, setDepartureCity] = useState<DepartureCity | "">("");
  // Optional return leg after the activity ends - same city list as
  // departureCity, entirely skippable.
  const [returnCity, setReturnCity] = useState<DepartureCity | "">("");

  const [rideSlugs, setRideSlugs] = useState<string[]>([]);

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
  // Same pattern as TourBookingFlow/StayReservationForm: render success
  // inline instead of navigating away — the reservation is PENDING, not
  // confirmed, so there's nothing on a separate page a fresh fetch would
  // show that isn't already known right here.
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getLanguages().then((items) => {
      if (!cancelled) {
        setLanguages(items);
        setLanguagesLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) setLanguagesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        // Never let the guest counts hold a value they could not actually
        // book once real capacity comes back lower than their pick.
        const units = availability?.unitsAvailable ?? null;
        if (units != null) {
          setAdults((current) => (current > units ? Math.max(1, units) : current));
          setChildren((current) => (current > units ? 0 : current));
        }
      })
      .catch(() => !cancelled && setFetched({ key, availability: null }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  function toggleRide(rideSlug: string) {
    setRideSlugs((cur) => (cur.includes(rideSlug) ? cur.filter((s) => s !== rideSlug) : [...cur, rideSlug]));
  }

  function toggleLanguage(id: string) {
    setPreferredLanguageIds((cur) => (cur.includes(id) ? cur.filter((l) => l !== id) : [...cur, id]));
  }

  // Display-only estimate — never submitted. createBooking sends slug, date,
  // slot, guests, vehicle, extras and contact; the server computes the
  // authoritative price.
  const partySize = adults + children;
  const total = activity ? activity.priceFrom * partySize : 0;
  const chosenSlot: TimeSlot | "" = timeSlot;
  const otherActivities = activities.filter((a) => a.slug !== slug);
  const extrasTotal = otherActivities
    .filter((a) => rideSlugs.includes(a.slug))
    .reduce((sum, a) => sum + a.priceFrom, 0);

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (step === 0 && !slug) e.activitySlug = tb("errorPickAdventure");
    if (step === 1) {
      if (!date) e.date = t("errorPickDate");
      else if (date < min) e.date = t("errorPastDate");
      if (!chosenSlot) e.timeSlot = tb("errorPickTimeSlot");
      if (adults < 1) e.adults = t("errorAtLeastOneAdult");
      if (soldOut) e.adults = tb("errorSoldOut", { activity: activity?.title ?? "" });
      else if (unitsAvailable != null && unitsAvailable < partySize)
        e.adults =
          unitsAvailable === 1
            ? tb("errorLimitedSpotsOne", { n: unitsAvailable })
            : tb("errorLimitedSpotsOther", { n: unitsAvailable });
      if (partySize < 1 || partySize > MAX_PARTY_SIZE)
        e.adults = tb("errorPartySizeRange", { max: MAX_PARTY_SIZE });
    }
    if (step === 2) {
      if (preferredLanguageIds.length === 0 && !otherLanguageRequested.trim()) {
        e.language = t("errorLanguageRequired");
      }
    }
    if (step === 3) {
      if (hasOwnVehicle === null) e.arrivalMode = t("errorArrivalMode");
    }
    if (step === 5) {
      if (!name.trim()) e.name = t("errorName");
      if (!email.trim()) e.email = t("errorEmail");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t("errorEmailInvalid");
      if (!phone.trim()) e.phone = t("errorPhone");
      if (!acceptedTerms) e.acceptedTerms = ta("termsRequired");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    step, slug, date, min, chosenSlot, soldOut, unitsAvailable, activity, adults, partySize,
    preferredLanguageIds, otherLanguageRequested, hasOwnVehicle, name, email, phone, acceptedTerms,
    t, tb, ta,
  ]);

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
    if (!validateStep()) return;
    setSubmitting(true);
    setFormError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    const result = await api.createBooking({
      activitySlug: slug,
      date,
      timeSlot: chosenSlot as TimeSlot,
      numberOfAdults: adults,
      numberOfChildren: children,
      rideSlugs,
      arrivalMode: hasOwnVehicle === false ? "TRANSPORT" : "OWN_VEHICLE",
      departureCity: departureCity || undefined,
      returnCity: returnCity || undefined,
      preferredLanguageIds: preferredLanguageIds.length > 0 ? preferredLanguageIds : undefined,
      otherLanguageRequested: otherLanguageRequested.trim() || undefined,
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
        result.errors ? tb("errorFormSteps") : (result.message ?? t("errorGeneric")),
      );
      setSubmitting(false);
      return;
    }

    toast.success(t("reservedConfirmation", { id: result.data.id }));
    setBooking(result.data);
    setSubmitting(false);
  }

  if (booking) {
    return (
      <div className="tour-booking-success" role="status">
        <span className="tour-booking-success-icon" aria-hidden="true">✓</span>
        <div>
          <p className="tour-booking-success-kicker">{t("successPendingLabel")}</p>
          <h3>{t("reservedConfirmation", { id: booking.id })}</h3>
          <p>{t("reservedBody", { id: booking.id })}</p>
        </div>
        <ol className="tour-booking-success-steps">
          <li>
            <span>1</span>
            <div>
              <strong>{t("successReviewTitle")}</strong>
              <p>{t("successReviewBody")}</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>{t("successEmailTitle")}</strong>
              <p>{t("successEmailBody", { email })}</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>{t("successAccountTitle")}</strong>
              <p>{t("successAccountBody")}</p>
            </div>
          </li>
        </ol>
        <p className="tour-booking-success-note">{t("paymentNote")}</p>
      </div>
    );
  }

  return (
    <div className="tour-book-flow">
      <div
        className="stepper"
        aria-label={STEPS[step]}
        style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}
      >
        {STEPS.map((label, i) => (
          <span
            key={label}
            className="s"
            data-state={i === step ? "active" : i < step ? "done" : "todo"}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="step-dot" aria-hidden="true">{i < step ? "✓" : i + 1}</span>
            <span className="step-label">{label}</span>
          </span>
        ))}
      </div>

      <div className="tour-book-step-heading">
        <span>0{step + 1}</span>
        <h3>{STEPS[step]}</h3>
        <strong className="tour-book-step-amount">
          {step === 0 && (activity ? `€${activity.priceFrom}` : "")}
          {step === 1 && `€${total}`}
          {step === 2 && "€0"}
          {step === 3 && (hasOwnVehicle === false ? t("onRequest") : t("ownVehicle"))}
          {step === 4 && `€${extrasTotal}`}
          {step === 5 && `€${total + extrasTotal}`}
        </strong>
      </div>

      {/* ---------- 1. adventure ---------- */}
      {step === 0 && (
        <>
          <p className="hint">{tb("adventureHint")}</p>
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
                    {tb("fromPrice", { price: a.priceFrom, duration: formatDuration(a.durationMins) })}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {errors.activitySlug && <div className="alert">{errors.activitySlug}</div>}
        </>
      )}

      {/* ---------- 2. date + travelers ---------- */}
      {step === 1 && (
        <div className="reserve-form" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
          <div className="field" data-invalid={!!errors.date}>
            <label htmlFor="tf-date">{t("dateLabel")}</label>
            <DatePicker id="tf-date" min={min} value={date} onChange={setDate} invalid={!!errors.date} />
            {errors.date && <span className="err">{errors.date}</span>}
          </div>

          <div className="tour-book-guests">
            <div className="guest-row field" data-invalid={!!errors.adults}>
              <div>
                <label>{t("adultsLabel")}</label>
                {errors.adults && <span className="err">{errors.adults}</span>}
              </div>
              <div className="guest-stepper">
                <button
                  type="button"
                  aria-label={`− ${t("adultsLabel")}`}
                  onClick={() => setAdults((value) => Math.max(1, value - 1))}
                  disabled={adults <= 1}
                >
                  −
                </button>
                <output aria-live="polite">{adults}</output>
                <button
                  type="button"
                  aria-label={`+ ${t("adultsLabel")}`}
                  onClick={() =>
                    setAdults((value) =>
                      Math.min(
                        unitsAvailable != null ? Math.min(MAX_PARTY_SIZE, unitsAvailable) : MAX_PARTY_SIZE,
                        value + 1,
                      ),
                    )
                  }
                  disabled={adults >= (unitsAvailable != null ? Math.min(MAX_PARTY_SIZE, unitsAvailable) : MAX_PARTY_SIZE)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="guest-row field">
              <label>{t("childrenLabel")}</label>
              <div className="guest-stepper">
                <button
                  type="button"
                  aria-label={`− ${t("childrenLabel")}`}
                  onClick={() => setChildren((value) => Math.max(0, value - 1))}
                  disabled={children <= 0}
                >
                  −
                </button>
                <output aria-live="polite">{children}</output>
                <button
                  type="button"
                  aria-label={`+ ${t("childrenLabel")}`}
                  onClick={() =>
                    setChildren((value) =>
                      Math.min(
                        unitsAvailable != null ? Math.min(MAX_PARTY_SIZE, unitsAvailable) : MAX_PARTY_SIZE,
                        value + 1,
                      ),
                    )
                  }
                  disabled={children >= (unitsAvailable != null ? Math.min(MAX_PARTY_SIZE, unitsAvailable) : MAX_PARTY_SIZE)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="field" data-invalid={!!errors.timeSlot}>
            <label>{tb("preferredDeparture")}</label>
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
            {!date && <p className="hint">{tb("pickDateForAvailability")}</p>}
            {date && loadingAvailability && <p className="hint">{tb("checkingAvailability")}</p>}
            {date && !loadingAvailability && soldOut && (
              <p className="hint err">{tb("fullyBookedTryAnother")}</p>
            )}
            {date && !loadingAvailability && !soldOut && unitsAvailable != null && (
              <p className="hint">
                {unitsAvailable === 1
                  ? tb("spotsAvailableOne", { n: unitsAvailable })
                  : tb("spotsAvailableOther", { n: unitsAvailable })}
              </p>
            )}
            {errors.timeSlot && <span className="err">{errors.timeSlot}</span>}
          </div>
        </div>
      )}

      {/* ---------- 3. preferred guide/instructor language ---------- */}
      {step === 2 && (
        <div className="field" data-invalid={!!errors.language}>
          <label>{t("preferredLanguageLabel")}</label>
          <p className="hint">{t("preferredLanguageHint")}</p>
          {languages.length > 0 && (
            <div className="ride-options">
              {languages.map((language) => (
                <label key={language.id} className="ride-option">
                  <input
                    type="checkbox"
                    checked={preferredLanguageIds.includes(language.id)}
                    onChange={() => toggleLanguage(language.id)}
                  />
                  <span>{language.name}</span>
                  <span className="ride-price">€0</span>
                </label>
              ))}
            </div>
          )}
          <input
            className="tour-other-language"
            placeholder={t("otherLanguagePlaceholder")}
            value={otherLanguageRequested}
            onChange={(e) => setOtherLanguageRequested(e.target.value)}
          />
          {errors.language && <span className="err">{errors.language}</span>}
        </div>
      )}

      {/* ---------- 4. vehicle ---------- */}
      {step === 3 && (
        <div className="field" data-invalid={!!errors.arrivalMode}>
          <label>{t("howWillYouArrive")}</label>
          <div className="ride-options">
            <label className="ride-option">
              <input
                type="radio"
                name="hasOwnVehicle"
                checked={hasOwnVehicle === true}
                onChange={() => setHasOwnVehicle(true)}
              />
              <span>{t("ownVehicle")}</span>
              <span className="ride-price">{t("ownVehicleHint")}</span>
            </label>
            <label className="ride-option">
              <input
                type="radio"
                name="hasOwnVehicle"
                checked={hasOwnVehicle === false}
                onChange={() => setHasOwnVehicle(false)}
              />
              <span>{t("needTransport")}</span>
              <span className="ride-price">{t("needTransportHint")}</span>
            </label>
          </div>
          {errors.arrivalMode && <span className="err">{errors.arrivalMode}</span>}
          {hasOwnVehicle === false && (
            <div className="booking-empty-state">
              <span aria-hidden="true">T</span>
              <div>
                <strong>{t("transportOnRequest")}</strong>
                <small>{t("transportAssignmentHint")}</small>
              </div>
            </div>
          )}

          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="tf-departure-city">{t("departureCityLabel")}</label>
            <select
              id="tf-departure-city"
              value={departureCity}
              onChange={(e) => setDepartureCity(e.target.value as DepartureCity | "")}
            >
              <option value="">{t("departureCityPlaceholder")}</option>
              {DEPARTURE_CITIES.map((city) => (
                <option key={city} value={city}>
                  {DEPARTURE_CITY_LABELS[city]}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="tf-return-city">{t("returnCityLabel")}</label>
            <p className="hint">{t("returnCityHint")}</p>
            <select
              id="tf-return-city"
              value={returnCity}
              onChange={(e) => setReturnCity(e.target.value as DepartureCity | "")}
            >
              <option value="">{t("returnCityPlaceholder")}</option>
              {DEPARTURE_CITIES.map((city) => (
                <option key={city} value={city}>
                  {DEPARTURE_CITY_LABELS[city]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ---------- 5. extras (other activities) ---------- */}
      {step === 4 && (
        <div className="field">
          <label>{t("addExtra")}</label>
          {otherActivities.length === 0 ? (
            <div className="booking-empty-state">
              <span aria-hidden="true">+</span>
              <div><strong>{t("extrasUnavailable")}</strong></div>
            </div>
          ) : (
            <div className="ride-options">
              {otherActivities.map((a) => (
                <label key={a.slug} className="ride-option">
                  <input
                    type="checkbox"
                    checked={rideSlugs.includes(a.slug)}
                    onChange={() => toggleRide(a.slug)}
                  />
                  <span>{a.title}</span>
                  <span className="ride-price">{t("fromPrice", { price: a.priceFrom })}</span>
                </label>
              ))}
            </div>
          )}
          <p className="hint">{t("confirmOnSite")}</p>
        </div>
      )}

      {/* ---------- 6. review & book (incl. contact details) ---------- */}
      {step === 5 && (
        <div className="tour-review-step">
          <div className="reserve-form tour-review-details" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
            <div className="field" data-invalid={!!errors.name}>
              <label htmlFor="tf-name">{t("fullName")}</label>
              <input id="tf-name" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
              {errors.name && <span className="err">{errors.name}</span>}
            </div>

            <div className="field" data-invalid={!!errors.email}>
              <label htmlFor="tf-email">{t("email")}</label>
              <input
                id="tf-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <span className="err">{errors.email}</span>}
            </div>

            <div className="field" data-invalid={!!errors.phone}>
              <label htmlFor="tf-phone">{t("phone")}</label>
              <input id="tf-phone" type="tel" value={phone} autoComplete="tel" onChange={(e) => setPhone(e.target.value)} />
              {errors.phone && <span className="err">{errors.phone}</span>}
            </div>

            <div className="field">
              <label htmlFor="tf-notes">{t("notesLabel")}</label>
              <input
                id="tf-notes"
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <p className="hint tour-review-hint">{t("reviewHint")}</p>
          <div className="summary tour-review-summary">
            <div className="row">
              <span className="k">{tb("adventureLabel")}</span>
              <span>{activity?.title}</span>
            </div>
            <div className="row">
              <span className="k">{t("dateLabelSummary")}</span>
              <span>{prettyDate(date, locale)}</span>
            </div>
            <div className="row">
              <span className="k">{tb("departureLabel")}</span>
              <span>{chosenSlot ? SLOT_LABELS[chosenSlot] : "—"}</span>
            </div>
            <div className="row">
              <span className="k">{t("travelersLabel")}</span>
              <span>
                {adults} {t("adultsLabel").toLowerCase()}
                {children > 0 ? ` · ${children} ${t("childrenLabel").toLowerCase()}` : ""}
              </span>
            </div>
            <div className="row">
              <span className="k">{t("reviewVehicleLabel")}</span>
              <span>
                {hasOwnVehicle
                  ? t("ownVehicle")
                  : t("needTransport")}
              </span>
            </div>
            {departureCity && (
              <div className="row">
                <span className="k">{t("departureCityLabel")}</span>
                <span>{DEPARTURE_CITY_LABELS[departureCity]}</span>
              </div>
            )}
            {returnCity && (
              <div className="row">
                <span className="k">{t("returnCityLabel")}</span>
                <span>{DEPARTURE_CITY_LABELS[returnCity]}</span>
              </div>
            )}
            {rideSlugs.length > 0 && (
              <div className="row">
                <span className="k">{t("reviewExtrasLabel")}</span>
                <span>
                  {otherActivities
                    .filter((a) => rideSlugs.includes(a.slug))
                    .map((a) => `${a.title} — €${a.priceFrom}`)
                    .join(", ")}
                </span>
              </div>
            )}
            {(email || phone) && (
              <div className="row">
                <span className="k">{t("contactLabel")}</span>
                <span>
                  {email} · {phone}
                </span>
              </div>
            )}
            {(preferredLanguageIds.length > 0 || otherLanguageRequested.trim()) && (
              <div className="row">
                <span className="k">{t("reviewLanguageLabel")}</span>
                <span>
                  {[
                    ...languages.filter((l) => preferredLanguageIds.includes(l.id)).map((l) => l.name),
                    ...(otherLanguageRequested.trim() ? [otherLanguageRequested.trim()] : []),
                  ].join(", ")}
                </span>
              </div>
            )}
            {notes && (
              <div className="row">
                <span className="k">{t("notesLabelSummary")}</span>
                <span>{notes}</span>
              </div>
            )}
            <div className="row total">
              <span>{t("totalLabel")}</span>
              <span>€{total + extrasTotal}</span>
            </div>
          </div>
          <label className="ride-option tour-review-terms" data-invalid={!!errors.acceptedTerms}>
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            <span>
              {ta("termsPre")}<Link href="/legal/terms">{ta("termsLinkTerms")}</Link>
              {ta("termsMid")}<Link href="/legal/privacy">{ta("termsLinkPrivacy")}</Link>{ta("termsPost")}
            </span>
          </label>
          {errors.acceptedTerms && <span className="err">{errors.acceptedTerms}</span>}
          {formError && <div className="alert">{formError}</div>}
        </div>
      )}

      <div className="book-actions">
        {step > 0 && (
          <button type="button" className="btn-quiet" onClick={back} disabled={submitting}>
            ← {t("back")}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-accent" onClick={next} disabled={!languagesLoaded}>
            {t("continue")}
          </button>
        ) : (
          <button type="button" className="btn-accent" onClick={submit} disabled={submitting}>
            {submitting ? t("reserving") : t("requestToBook")}
          </button>
        )}
      </div>
      <p className="note">{t("noChargeNote")}</p>
    </div>
  );
}
