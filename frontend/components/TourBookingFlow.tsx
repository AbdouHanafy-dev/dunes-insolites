"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as api from "@/lib/api";
import type { Language } from "@/lib/api";
import { DEPARTURE_CITIES, DEPARTURE_CITY_LABELS, MAX_PARTY_SIZE, type Accommodation, type Activity, type DepartureCity } from "@/lib/types";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import { localizedLanguageName } from "@/lib/languageFlags";

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
 * Book-panel wizard for a single Tour (Route Insolite circuit): Date &
 * travelers → Guide language → Vehicle → Accommodation → Extras → Review & book. Guests never
 * choose a staff member: they state their preferred language and the admin
 * assigns an available guide from the reservation staff panel. The guest only
 * says whether transport is needed; staff assign the actual chauffeur and
 * vehicle after reviewing the request. Extras remain catalogue-driven.
 */
export default function TourBookingFlow({
  tourSlug,
  tourTitle,
  adultPrice,
  childPrice,
  accommodations = [],
  campStaySlug = "",
}: {
  tourSlug: string;
  tourTitle: string;
  adultPrice: number;
  childPrice: number;
  overnightsAtCamp?: boolean;
  accommodations?: Accommodation[];
  /** The circuit camp stay (set in the back office) - target of each tier's "voir détails" link. */
  campStaySlug?: string;
}) {
  const t = useTranslations("tourBookingForm");
  const ta = useTranslations("authForm");
  const toast = useToast();
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [accommodationSlug, setAccommodationSlug] = useState("");
  const [accommodationQty, setAccommodationQty] = useState(1);

  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(null);
  const [departureCity, setDepartureCity] = useState<DepartureCity | "">("");
  // Optional return leg after the tour ends - same city list as
  // departureCity, entirely skippable.
  const [returnCity, setReturnCity] = useState<DepartureCity | "">("");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [rideSlugs, setRideSlugs] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [preferredLanguageIds, setPreferredLanguageIds] = useState<string[]>([]);
  const [otherLanguageRequested, setOtherLanguageRequested] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const idempotencyKeyRef = useRef("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getActivities(locale).then((extras) => {
      if (cancelled) return;
      setActivities(extras);
      setCatalogLoaded(true);
    }).catch(() => {
      if (!cancelled) setCatalogLoaded(true);
    });
    api.getLanguages().then((items) => !cancelled && setLanguages(items));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const visibleSteps = [
    { id: 0, label: t("stepDateTravelers") },
    { id: 1, label: t("stepGuide") },
    { id: 2, label: t("stepVehicle") },
    { id: 5, label: t("stepAccommodation") },
    { id: 3, label: t("stepExtras") },
    { id: 4, label: t("stepReview") },
  ];
  const activeStepPosition = visibleSteps.findIndex((item) => item.id === step);
  const activeStep = visibleSteps[activeStepPosition] ?? visibleSteps[0];

  const extrasTotal = activities
    .filter((activity) => rideSlugs.includes(activity.slug))
    .reduce((sum, activity) => sum + activity.priceFrom, 0);
  const availableAccommodations = accommodations;
  const selectedAccommodation = availableAccommodations.find((item) => item.slug === accommodationSlug);
  const accommodationTotal = selectedAccommodation ? selectedAccommodation.priceFrom * accommodationQty : 0;

  function toggleRide(slug: string) {
    setRideSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function toggleLanguage(id: string) {
    setPreferredLanguageIds((cur) => (cur.includes(id) ? cur.filter((l) => l !== id) : [...cur, id]));
  }

  const min = todayISO();
  const total = adultPrice * adults + childPrice * children;

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!date) e.date = t("errorPickDate");
      else if (date < min) e.date = t("errorPastDate");
      if (adults < 1) e.adults = t("errorAtLeastOneAdult");
    }
    if (step === 1) {
      if (preferredLanguageIds.length === 0 && !otherLanguageRequested.trim()) {
        e.language = t("errorLanguageRequired");
      }
    }
    if (step === 5 && !accommodationSlug) {
      e.accommodation = t("errorAccommodationRequired");
    }
    if (step === 2) {
      if (hasOwnVehicle === null) e.arrivalMode = t("errorArrivalMode");
    }
    if (step === 4) {
      if (!name.trim()) e.name = t("errorName");
      if (!email.trim()) e.email = t("errorEmail");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t("errorEmailInvalid");
      if (!phone.trim()) e.phone = t("errorPhone");
      if (!acceptedTerms) e.acceptedTerms = ta("termsRequired");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep()) {
      const position = visibleSteps.findIndex((item) => item.id === step);
      setStep(visibleSteps[Math.min(visibleSteps.length - 1, position + 1)]?.id ?? 4);
    }
  }

  function back() {
    setErrors({});
    const position = visibleSteps.findIndex((item) => item.id === step);
    setStep(visibleSteps[Math.max(0, position - 1)]?.id ?? 0);
  }

  async function submit() {
    if (!validateStep()) return;
    setSubmitting(true);
    setFormError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    const result = await api.createTourBooking({
      tourSlug,
      date,
      numberOfAdults: adults,
      numberOfChildren: children,
      rideSlugs,
      accommodations: accommodationSlug
        ? [{ accommodationSlug, quantity: accommodationQty }]
        : undefined,
      arrivalMode: hasOwnVehicle === false ? "TRANSPORT" : "OWN_VEHICLE",
      departureCity: departureCity || undefined,
      returnCity: returnCity || undefined,
      preferredLanguageIds: preferredLanguageIds.length > 0 ? preferredLanguageIds : undefined,
      otherLanguageRequested: otherLanguageRequested.trim() || undefined,
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
      idempotencyKey: idempotencyKeyRef.current,
      acceptedTerms,
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
      <div className="stepper" aria-label={activeStep.label}>
        {visibleSteps.map((item, i) => {
          return (
            <span
              key={item.id}
              className="s"
              data-state={i === activeStepPosition ? "active" : i < activeStepPosition ? "done" : "todo"}
              aria-current={i === activeStepPosition ? "step" : undefined}
            >
              <span className="step-dot" aria-hidden="true">{i < activeStepPosition ? "✓" : i + 1}</span>
              <span className="step-label">{item.label}</span>
            </span>
          );
        })}
      </div>

      <div className="tour-book-step-heading">
        <span>0{activeStepPosition + 1}</span>
        <h3>{activeStep.label}</h3>
        <strong className="tour-book-step-amount">
          {step === 0 && `€${total}`}
          {step === 5 && (selectedAccommodation ? `€${accommodationTotal}` : t("chooseAccommodation"))}
          {step === 1 && "€0"}
          {step === 2 && (hasOwnVehicle === false ? t("onRequest") : t("ownVehicle"))}
          {step === 3 && `€${extrasTotal}`}
          {step === 4 && `€${total + accommodationTotal + extrasTotal}`}
        </strong>
      </div>

      {/* ---------- 1. date + travelers ---------- */}
      {step === 0 && (
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
                <button type="button" aria-label={`− ${t("adultsLabel")}`} onClick={() => setAdults((value) => Math.max(1, value - 1))} disabled={adults <= 1}>−</button>
                <output aria-live="polite">{adults}</output>
                <button type="button" aria-label={`+ ${t("adultsLabel")}`} onClick={() => setAdults((value) => Math.min(MAX_PARTY_SIZE, value + 1))} disabled={adults >= MAX_PARTY_SIZE}>+</button>
              </div>
            </div>

            <div className="guest-row field">
              <label>{t("childrenLabel")}</label>
              <div className="guest-stepper">
                <button type="button" aria-label={`− ${t("childrenLabel")}`} onClick={() => setChildren((value) => Math.max(0, value - 1))} disabled={children <= 0}>−</button>
                <output aria-live="polite">{children}</output>
                <button type="button" aria-label={`+ ${t("childrenLabel")}`} onClick={() => setChildren((value) => Math.min(MAX_PARTY_SIZE, value + 1))} disabled={children >= MAX_PARTY_SIZE}>+</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- accommodation at the Sabria camp ---------- */}
      {step === 5 && (
        <div className="field" data-invalid={!!errors.accommodation}>
          <label>{t("chooseAccommodation")}</label>
          <p className="hint">{t("chooseAccommodationHint")}</p>
          {availableAccommodations.length > 0 ? (
            <>
              <div className="ride-options">
                {availableAccommodations.map((item) => {
                  const isSelected = accommodationSlug === item.slug;
                  return (
                    <div key={item.slug}>
                      <label className="ride-option">
                        <input
                          type="radio"
                          name="tourAccommodation"
                          checked={isSelected}
                          onChange={() => {
                            setAccommodationSlug(item.slug);
                            setAccommodationQty(1);
                          }}
                        />
                        <span>
                          <strong>{item.title}</strong>
                          {item.sleeps && <small>{item.sleeps}</small>}
                        </span>
                        <span className="ride-price">{t("accommodationPrice", { price: item.priceFrom })}</span>
                      </label>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 16px 12px" }}>
                        {campStaySlug && (
                          <Link
                            href={`/camp/${campStaySlug}/${item.slug}`}
                            target="_blank"
                            className="pick-details-link"
                            style={{ position: "static" }}
                          >
                            {t("viewDetails")}
                          </Link>
                        )}
                        {isSelected && (
                          <div className="guest-stepper">
                            <button type="button" aria-label={`− ${t("accommodationQuantity")}`} onClick={() => setAccommodationQty((value) => Math.max(1, value - 1))} disabled={accommodationQty <= 1}>−</button>
                            <output aria-live="polite">{accommodationQty}</output>
                            <button type="button" aria-label={`+ ${t("accommodationQuantity")}`} onClick={() => setAccommodationQty((value) => value + 1)}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="booking-empty-state"><span aria-hidden="true">!</span><div><strong>{t("accommodationUnavailable")}</strong></div></div>
          )}
          {errors.accommodation && <span className="err">{errors.accommodation}</span>}
        </div>
      )}

      {/* ---------- 2. preferred guide language; staff assigns the person ---------- */}
      {step === 1 && (
        <div className="field" data-invalid={!!errors.language}>
          <label>{t("preferredLanguageLabel")}</label>
          <p className="hint">{t("preferredLanguageHint")}</p>
          {languages.length > 0 && (
            <div className="ride-options">
              {languages.map((language) => (
                  <label key={language.id} className="ride-option">
                    <input type="checkbox" checked={preferredLanguageIds.includes(language.id)} onChange={() => toggleLanguage(language.id)} />
                    <span>{localizedLanguageName(locale, language.name)}</span>
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

      {/* ---------- 3. vehicle ---------- */}
      {step === 2 && (
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

      {/* ---------- 4. extras ---------- */}
      {step === 3 && (
        <div className="field">
          <label>{t("addExtra")}</label>
          {activities.length === 0 ? (
            <div className="booking-empty-state">
              <span aria-hidden="true">+</span>
              <div><strong>{t("extrasUnavailable")}</strong></div>
            </div>
          ) : (
            <div className="ride-options">
              {activities.map((a) => (
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

      {/* ---------- 5. review & book (incl. contact details) ---------- */}
      {step === 4 && (
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
              <span className="k">{t("tripLabel")}</span>
              <span>{tourTitle}</span>
            </div>
            <div className="row">
              <span className="k">{t("dateLabelSummary")}</span>
              <span>{prettyDate(date, locale)}</span>
            </div>
            {selectedAccommodation && (
              <div className="row">
                <span className="k">{t("accommodationLabel")}</span>
                <span>{selectedAccommodation.title} × {accommodationQty}</span>
              </div>
            )}
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
                  {activities
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
                    ...languages.filter((l) => preferredLanguageIds.includes(l.id)).map((l) => localizedLanguageName(locale, l.name)),
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
            <div className="row">
              <span className="k">{adults} × {t("adultsLabel")}</span>
              <span>€{adultPrice * adults}</span>
            </div>
            {children > 0 && (
              <div className="row">
                <span className="k">{children} × {t("childrenLabel")}</span>
                <span>€{childPrice * children}</span>
              </div>
            )}
            <div className="row total">
              <span>{t("totalLabel")}</span>
              <span>€{total + accommodationTotal + extrasTotal}</span>
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

      {/* Step 5 ("Paiement") only ever appears as the post-submit confirmation
          above (the `booking` early return) — there is no payment gateway in
          this codebase, so nothing here is interactive before that point. */}

      <div className="book-actions">
        {step > 0 && (
          <button type="button" className="btn-quiet" onClick={back} disabled={submitting}>
            ← {t("back")}
          </button>
        )}
        {activeStepPosition < visibleSteps.length - 1 ? (
          <button type="button" className="btn-accent" onClick={next} disabled={!catalogLoaded}>
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
