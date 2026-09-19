"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as api from "@/lib/api";
import type { Language, ServiceOptionCatalogItem } from "@/lib/api";
import { MAX_PARTY_SIZE, type Activity } from "@/lib/types";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";

type ServiceAvailabilityState = {
  forDate: string;
  bySlug: Record<string, api.ServiceOptionAvailability | null>;
};

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
 * travelers → Guide → Vehicle → Extras → Review & book → Payment. Guide is
 * chosen before vehicle here — the reverse of StayReservationForm's order —
 * per explicit business direction (19 Sep 2026): a guide who already brings
 * a support vehicle makes the following vehicle step moot, so asking guide
 * first lets that step short-circuit cleanly instead of asking the guest to
 * contradict themselves. "Payment" is the same request-to-book confirmation
 * every other flow in this codebase ends on — no payment gateway exists
 * here; staff confirm and collect payment separately.
 */
export default function TourBookingFlow({
  tourSlug,
  tourTitle,
  priceFrom,
}: {
  tourSlug: string;
  tourTitle: string;
  priceFrom: number;
}) {
  const t = useTranslations("tourBookingForm");
  const toast = useToast();
  const locale = useLocale();
  const PRICING_UNIT_LABEL: Record<ServiceOptionCatalogItem["pricingUnit"], string> = {
    PER_DAY: t("unitDay"),
    PER_BOOKING: t("unitBooking"),
    PER_PERSON: t("unitPerson"),
    PER_VEHICLE: t("unitVehicle"),
  };
  const STEPS = [
    t("stepDateTravelers"),
    t("stepGuide"),
    t("stepVehicle"),
    t("stepExtras"),
    t("stepReview"),
    t("stepPayment"),
  ] as const;

  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [guideOptions, setGuideOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [transportOptions, setTransportOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [guideSlug, setGuideSlug] = useState("");
  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(null);
  const [transportSlug, setTransportSlug] = useState("");
  const [pickupHotelName, setPickupHotelName] = useState("");
  const [pickupAirport, setPickupAirport] = useState("");
  const [pickupFlightNumber, setPickupFlightNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupArrivalTime, setPickupArrivalTime] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [serviceAvailability, setServiceAvailability] = useState<ServiceAvailabilityState>();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [rideSlugs, setRideSlugs] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [preferredLanguageIds, setPreferredLanguageIds] = useState<string[]>([]);
  const [otherLanguageRequested, setOtherLanguageRequested] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getServiceOptions("GUIDE").then((items) => !cancelled && setGuideOptions(items));
    api.getServiceOptions("TRANSPORT").then((items) => !cancelled && setTransportOptions(items));
    api.getActivities(locale).then((items) => !cancelled && setActivities(items));
    api.getLanguages().then((items) => !cancelled && setLanguages(items));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const selectedGuide = guideOptions.find((o) => o.slug === guideSlug);
  const selectedTransport = transportOptions.find((o) => o.slug === transportSlug);
  const needsPickupDetails = !!selectedTransport?.requiresPickupLocation;
  const pickupFields = new Set(selectedTransport?.pickupFields ?? []);
  const requiredPickupFields = new Set(selectedTransport?.requiredPickupFields ?? []);
  // A guide who already brings a support vehicle makes "how will you get
  // there" moot - force + lock the vehicle step to "own vehicle" so the
  // guest can't pick transport and trigger the backend's mutual-exclusion
  // rejection.
  const guideIncludesVehicle = !!selectedGuide && !selectedGuide.requiresCustomerVehicle;

  function selectGuide(slug: string) {
    setGuideSlug(slug);
    const guide = guideOptions.find((o) => o.slug === slug);
    if (guide && !guide.requiresCustomerVehicle) {
      setHasOwnVehicle(true);
      setTransportSlug("");
    }
  }

  const partySize = adults + children;

  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    const options = [...guideOptions, ...transportOptions];
    Promise.all(
      options.map(async (option) => [
        option.slug,
        await api.getServiceOptionAvailability(option.slug, date, ctrl.signal),
      ] as const),
    ).then((entries) => {
      if (!ctrl.signal.aborted) {
        setServiceAvailability({ forDate: date, bySlug: Object.fromEntries(entries) });
      }
    }).catch(() => {
      // The catalogue remains usable when the advisory availability endpoint
      // is temporarily unreachable; booking still re-checks under a lock.
    });
    return () => ctrl.abort();
  }, [date, guideOptions, transportOptions]);

  function optionQuantity(option: ServiceOptionCatalogItem): number {
    return option.pricingUnit === "PER_PERSON" ? partySize : 1;
  }

  function optionAvailability(option: ServiceOptionCatalogItem) {
    return serviceAvailability?.forDate === date
      ? serviceAvailability.bySlug[option.slug]
      : undefined;
  }

  function optionUnavailable(option: ServiceOptionCatalogItem): boolean {
    const availability = optionAvailability(option);
    return availability?.status === "UNAVAILABLE" ||
      (availability?.unitsAvailable != null && availability.unitsAvailable < optionQuantity(option));
  }

  function optionPrice(option: ServiceOptionCatalogItem): number | null {
    return option.priceTtc == null ? null : option.priceTtc * optionQuantity(option);
  }

  const serviceTotal = [selectedGuide, selectedTransport].reduce(
    (sum, option) => sum + (option ? optionPrice(option) ?? 0 : 0),
    0,
  );

  function toggleRide(slug: string) {
    setRideSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function toggleLanguage(id: string) {
    setPreferredLanguageIds((cur) => (cur.includes(id) ? cur.filter((l) => l !== id) : [...cur, id]));
  }

  const min = todayISO();
  const total = priceFrom * adults;

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!date) e.date = t("errorPickDate");
      else if (date < min) e.date = t("errorPastDate");
      if (adults < 1) e.adults = t("errorAtLeastOneAdult");
    }
    if (step === 1) {
      if (selectedGuide && optionUnavailable(selectedGuide)) e.guide = t("errorGuideUnavailable");
    }
    if (step === 2) {
      if (hasOwnVehicle === null) e.arrivalMode = t("errorArrivalMode");
      if (hasOwnVehicle === false && !transportSlug) e.transport = t("errorTransportRequired");
      if (selectedTransport && optionUnavailable(selectedTransport)) e.transport = t("errorTransportUnavailable");
      if (
        needsPickupDetails &&
        !pickupHotelName.trim() &&
        !pickupAirport.trim() &&
        !pickupAddress.trim() &&
        !pickupInstructions.trim()
      ) {
        e.pickup = t("errorPickup");
      }
    }
    if (step === 4) {
      if (!name.trim()) e.name = t("errorName");
      if (!email.trim()) e.email = t("errorEmail");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t("errorEmailInvalid");
      if (!phone.trim()) e.phone = t("errorPhone");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep()) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (!validateStep()) return;
    setSubmitting(true);
    setFormError("");

    const serviceOptions = [
      ...(selectedGuide ? [{
        serviceOptionSlug: selectedGuide.slug,
        quantity: optionQuantity(selectedGuide),
      }] : []),
      ...(transportSlug
        ? [
            {
              serviceOptionSlug: transportSlug,
              quantity: selectedTransport ? optionQuantity(selectedTransport) : 1,
              pickupHotelName: pickupHotelName.trim() || undefined,
              pickupAirport: pickupAirport.trim() || undefined,
              pickupFlightNumber: pickupFlightNumber.trim() || undefined,
              pickupAddress: pickupAddress.trim() || undefined,
              pickupArrivalTime: pickupArrivalTime.trim() || undefined,
              pickupInstructions: pickupInstructions.trim() || undefined,
            },
          ]
        : []),
    ];

    const result = await api.createTourBooking({
      tourSlug,
      date,
      numberOfAdults: adults,
      numberOfChildren: children,
      rideSlugs,
      arrivalMode: hasOwnVehicle ? "OWN_VEHICLE" : "TRANSPORT",
      serviceOptions: serviceOptions.length > 0 ? serviceOptions : undefined,
      preferredLanguageIds: preferredLanguageIds.length > 0 ? preferredLanguageIds : undefined,
      otherLanguageRequested: otherLanguageRequested.trim() || undefined,
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
        <p className="note" style={{ marginTop: 8 }}>{t("paymentNote")}</p>
      </div>
    );
  }

  return (
    <div className="tour-book-flow">
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

      {/* ---------- 1. date + travelers ---------- */}
      {step === 0 && (
        <div className="reserve-form" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
          <div className="field" data-invalid={!!errors.date}>
            <label htmlFor="tf-date">{t("dateLabel")}</label>
            <DatePicker id="tf-date" min={min} value={date} onChange={setDate} invalid={!!errors.date} />
            {errors.date && <span className="err">{errors.date}</span>}
          </div>

          <div className="field" data-invalid={!!errors.adults}>
            <label htmlFor="tf-adults">{t("adultsLabel")}</label>
            <input
              id="tf-adults"
              type="number"
              min={1}
              max={MAX_PARTY_SIZE}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
            />
            {errors.adults && <span className="err">{errors.adults}</span>}
          </div>

          <div className="field">
            <label htmlFor="tf-children">{t("childrenLabel")}</label>
            <input
              id="tf-children"
              type="number"
              min={0}
              max={MAX_PARTY_SIZE}
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* ---------- 2. guide ---------- */}
      {step === 1 && (
        <div className="field" data-invalid={!!errors.guide}>
          <label>
            {t("chooseYourGuide")}
            {t("optionalSuffix")}
          </label>
          {guideOptions.length === 0 ? (
            <p className="hint">{t("noGuideOptions")}</p>
          ) : (
            <div className="ride-options">
              <label className="ride-option">
                <input
                  type="radio"
                  name="guide"
                  checked={guideSlug === ""}
                  onChange={() => selectGuide("")}
                />
                <span>{t("noGuide")}</span>
              </label>
              {guideOptions.map((o) => {
                const availability = optionAvailability(o);
                const unavailable = optionUnavailable(o);
                return (
                  <label key={o.slug} className="ride-option" data-disabled={unavailable || undefined}>
                    <input
                      type="radio"
                      name="guide"
                      checked={guideSlug === o.slug}
                      disabled={unavailable}
                      onChange={() => selectGuide(o.slug)}
                    />
                    <span className="service-option-copy">
                      <strong>{o.name}</strong>
                      {o.description && <small>{o.description}</small>}
                    </span>
                    <span className="ride-price">
                      {unavailable
                        ? t("unavailable")
                        : o.priceTtc == null
                          ? t("contactUsShort")
                          : t("plusPricePerUnit", { price: o.priceTtc, unit: PRICING_UNIT_LABEL[o.pricingUnit] })}
                      {!unavailable && availability?.unitsAvailable != null && availability.unitsAvailable <= 3 && (
                        <small>
                          {availability.unitsAvailable === 1
                            ? t("unitsLeftOne", { units: availability.unitsAvailable })
                            : t("unitsLeftOther", { units: availability.unitsAvailable })}
                        </small>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {errors.guide && <span className="err">{errors.guide}</span>}
        </div>
      )}

      {/* ---------- 3. vehicle ---------- */}
      {step === 2 && (
        <div className="field" data-invalid={!!errors.arrivalMode}>
          <label>{t("howWillYouArrive")}</label>
          {guideIncludesVehicle && <p className="hint">{t("guideIncludesVehicleNote")}</p>}
          <div className="ride-options">
            <label className="ride-option">
              <input
                type="radio"
                name="hasOwnVehicle"
                checked={hasOwnVehicle === true}
                onChange={() => {
                  setHasOwnVehicle(true);
                  setTransportSlug("");
                }}
              />
              <span>{t("ownVehicle")}</span>
              <span className="ride-price">{t("ownVehicleHint")}</span>
            </label>
            <label className="ride-option" data-disabled={guideIncludesVehicle || undefined}>
              <input
                type="radio"
                name="hasOwnVehicle"
                checked={hasOwnVehicle === false}
                disabled={guideIncludesVehicle}
                onChange={() => setHasOwnVehicle(false)}
              />
              <span>{t("needTransport")}</span>
              <span className="ride-price">{t("needTransportHint")}</span>
            </label>
          </div>
          {errors.arrivalMode && <span className="err">{errors.arrivalMode}</span>}

          {hasOwnVehicle === false && (
            <div className="field" data-invalid={!!errors.transport} style={{ marginTop: 12 }}>
              <label>{t("transportation")}</label>
              {transportOptions.length === 0 ? (
                <p className="hint">{t("noTransportOptions")}</p>
              ) : (
                <div className="ride-options">
                  {transportOptions.map((o) => {
                    const availability = optionAvailability(o);
                    const unavailable = optionUnavailable(o);
                    return (
                      <label key={o.slug} className="ride-option" data-disabled={unavailable || undefined}>
                        <input
                          type="radio"
                          name="transport"
                          checked={transportSlug === o.slug}
                          disabled={unavailable}
                          onChange={() => setTransportSlug(o.slug)}
                        />
                        <span className="service-option-copy">
                          <strong>{o.name}</strong>
                          {o.description && <small>{o.description}</small>}
                        </span>
                        <span className="ride-price">
                          {unavailable
                            ? t("unavailable")
                            : o.priceTtc == null
                              ? t("contactUsShort")
                              : t("pricePerUnit", { price: o.priceTtc, unit: PRICING_UNIT_LABEL[o.pricingUnit] })}
                          {!unavailable && availability?.unitsAvailable != null && availability.unitsAvailable <= 3 && (
                            <small>
                              {availability.unitsAvailable === 1
                                ? t("unitsLeftOne", { units: availability.unitsAvailable })
                                : t("unitsLeftOther", { units: availability.unitsAvailable })}
                            </small>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.transport && <span className="err">{errors.transport}</span>}

              {needsPickupDetails && (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {pickupFields.has("HOTEL_NAME") && <input
                    placeholder={t("pickupHotelPlaceholder")}
                    required={requiredPickupFields.has("HOTEL_NAME")}
                    value={pickupHotelName}
                    onChange={(e) => setPickupHotelName(e.target.value)}
                  />}
                  {pickupFields.has("AIRPORT") && <input
                    placeholder={t("pickupAirportPlaceholder")}
                    required={requiredPickupFields.has("AIRPORT")}
                    value={pickupAirport}
                    onChange={(e) => setPickupAirport(e.target.value)}
                  />}
                  {pickupFields.has("FLIGHT_NUMBER") && <input
                    placeholder={t("pickupFlightPlaceholder")}
                    required={requiredPickupFields.has("FLIGHT_NUMBER")}
                    value={pickupFlightNumber}
                    onChange={(e) => setPickupFlightNumber(e.target.value)}
                  />}
                  {pickupFields.has("ADDRESS") && <input
                    placeholder={t("pickupAddressPlaceholder")}
                    required={requiredPickupFields.has("ADDRESS")}
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                  />}
                  {pickupFields.has("ARRIVAL_TIME") && <input
                    placeholder={t("pickupArrivalTimePlaceholder")}
                    required={requiredPickupFields.has("ARRIVAL_TIME")}
                    value={pickupArrivalTime}
                    onChange={(e) => setPickupArrivalTime(e.target.value)}
                  />}
                  {pickupFields.has("INSTRUCTIONS") && <input
                    placeholder={t("pickupInstructionsPlaceholder")}
                    required={requiredPickupFields.has("INSTRUCTIONS")}
                    value={pickupInstructions}
                    onChange={(e) => setPickupInstructions(e.target.value)}
                  />}
                  {errors.pickup && <span className="err">{errors.pickup}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------- 4. extras ---------- */}
      {step === 3 && (
        <div className="field">
          <label>{t("addExtra")}</label>
          {activities.length === 0 ? (
            <p className="hint">{t("noExtrasAvailable")}</p>
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
        <>
          <div className="reserve-form" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
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
              <label>{t("preferredLanguageLabel")}</label>
              {languages.length > 0 && (
                <div className="ride-options">
                  {languages.map((lang) => (
                    <label key={lang.id} className="ride-option">
                      <input
                        type="checkbox"
                        checked={preferredLanguageIds.includes(lang.id)}
                        onChange={() => toggleLanguage(lang.id)}
                      />
                      <span>{lang.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <input
                style={{ marginTop: 8 }}
                placeholder={t("otherLanguagePlaceholder")}
                value={otherLanguageRequested}
                onChange={(e) => setOtherLanguageRequested(e.target.value)}
              />
              <p className="hint">{t("preferredLanguageHint")}</p>
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

          <p className="hint">{t("reviewHint")}</p>
          <div className="summary">
            <div className="row">
              <span className="k">{t("tripLabel")}</span>
              <span>{tourTitle}</span>
            </div>
            <div className="row">
              <span className="k">{t("dateLabelSummary")}</span>
              <span>{prettyDate(date, locale)}</span>
            </div>
            <div className="row">
              <span className="k">{t("travelersLabel")}</span>
              <span>
                {adults} {t("adultsLabel").toLowerCase()}
                {children > 0 ? ` · ${children} ${t("childrenLabel").toLowerCase()}` : ""}
              </span>
            </div>
            {selectedGuide && (
              <div className="row">
                <span className="k">{t("reviewGuideLabel")}</span>
                <span>{selectedGuide.name}</span>
              </div>
            )}
            <div className="row">
              <span className="k">{t("reviewVehicleLabel")}</span>
              <span>{hasOwnVehicle ? t("ownVehicle") : selectedTransport ? selectedTransport.name : t("needTransport")}</span>
            </div>
            {rideSlugs.length > 0 && (
              <div className="row">
                <span className="k">{t("reviewExtrasLabel")}</span>
                <span>
                  {activities
                    .filter((a) => rideSlugs.includes(a.slug))
                    .map((a) => a.title)
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
              <span>€{total}</span>
            </div>
            {serviceTotal > 0 && (
              <div className="row total">
                <span>{t("serviceOptionsLabel")}</span>
                <span>{serviceTotal} TND</span>
              </div>
            )}
          </div>
          {formError && <div className="alert">{formError}</div>}
        </>
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
        {step < 4 ? (
          <button type="button" className="btn-accent" onClick={next}>
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
