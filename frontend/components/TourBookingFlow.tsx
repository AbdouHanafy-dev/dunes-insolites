"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as api from "@/lib/api";
import type { Language } from "@/lib/api";
import { DEPARTURE_CITIES, DEPARTURE_CITY_LABELS, type Accommodation, type Activity, type DepartureCity } from "@/lib/types";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import ListSelect from "@/components/ListSelect";
import AccommodationPicker from "@/components/booking/AccommodationPicker";
import { useStepScroll } from "@/lib/useStepScroll";
import GuestPicker from "@/components/booking/GuestPicker";
import LanguageChips from "@/components/booking/LanguageChips";
import PhoneInput from "@/components/PhoneInput";
import { type Country } from "react-phone-number-input";
import { DEFAULT_COUNTRY_BY_LOCALE } from "@/lib/countryDialCodes";
import { composePhone } from "@/lib/phone";
import { activityQuantity, activityTotal } from "@/lib/activityPricing";
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
  const ts = useTranslations("stayReservationForm");
  const ta = useTranslations("authForm");
  const tb = useTranslations("bookingFlow");
  const toast = useToast();
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const flowRef = useStepScroll(step);
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
  const [phoneCountry, setPhoneCountry] = useState<Country>(() => (DEFAULT_COUNTRY_BY_LOCALE[locale] ?? "TN") as Country);
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
    .reduce((sum, activity) => sum + activityTotal(activity, adults + children), 0);
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
      phone: composePhone(phoneCountry, phone),
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
    <div className="tour-book-flow" ref={flowRef}>
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

          <GuestPicker
            adults={adults}
            kids={children}
            error={errors.adults}
            onChange={(a, c) => {
              setAdults(a);
              setChildren(c);
            }}
          />
        </div>
      )}

      {/* ---------- accommodation at the Sabria camp ---------- */}
      {step === 5 && (
        <div className="field" data-invalid={!!errors.accommodation}>
          <label>{t("chooseAccommodation")}</label>
          <p className="hint">{t("chooseAccommodationHint")}</p>
{availableAccommodations.length > 0 ? (
            <AccommodationPicker
              name="tourAccommodation"
              mode="single"
              items={availableAccommodations}
              selections={accommodationSlug ? { [accommodationSlug]: accommodationQty } : {}}
              onChange={(next) => {
                const first = Object.entries(next)[0];
                if (first) {
                  setAccommodationSlug(first[0]);
                  setAccommodationQty(first[1]);
                }
              }}
              detailsHref={(slug) => (campStaySlug ? `/camp/${campStaySlug}/${slug}` : null)}
            />
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
<LanguageChips languages={languages} selectedIds={preferredLanguageIds} onToggle={toggleLanguage} />
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
            <ListSelect
              id="tf-departure-city"
              value={departureCity}
              onChange={setDepartureCity}
              options={DEPARTURE_CITIES}
              labels={DEPARTURE_CITY_LABELS}
              placeholder={t("departureCityPlaceholder")}
            />
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="tf-return-city">{t("returnCityLabel")}</label>
            <p className="hint">{t("returnCityHint")}</p>
            <ListSelect
              id="tf-return-city"
              value={returnCity}
              onChange={setReturnCity}
              options={DEPARTURE_CITIES}
              labels={DEPARTURE_CITY_LABELS}
              placeholder={t("returnCityPlaceholder")}
            />
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
              <PhoneInput id="tf-phone" country={phoneCountry} onCountryChange={setPhoneCountry} value={phone} onChange={setPhone} invalid={!!errors.phone} searchPlaceholder={tb("phoneSearchPlaceholder")} />
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
                    .map((a) => `${a.title} — €${activityTotal(a, adults + children)}`)
                    .join(", ")}
                </span>
              </div>
            )}
            {(email || phone) && (
              <div className="row">
                <span className="k">{t("contactLabel")}</span>
                <span>
                  {email} · {composePhone(phoneCountry, phone)}
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
            {selectedAccommodation && (
              <div className="row">
                <span className="k">{accommodationQty} × {selectedAccommodation.title} · {ts("summaryNights", { nights: 1 })}</span>
                <span>€{accommodationTotal}</span>
              </div>
            )}
            {activities.filter((a) => rideSlugs.includes(a.slug)).map((a) => (
              <div className="row" key={a.slug}>
                <span className="k">
                  {a.title}
                  {activityQuantity(a, adults + children) > 1 ? ` × ${activityQuantity(a, adults + children)}` : ""}
                </span>
                <span>€{activityTotal(a, adults + children)}</span>
              </div>
            ))}
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
