"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as api from "@/lib/api";
import type { ServiceOptionCatalogItem, StayAvailability, TierAvailability } from "@/lib/api";
import { DEPARTURE_CITIES, DEPARTURE_CITY_LABELS, MAX_PARTY_SIZE, type Accommodation, type Activity, type DepartureCity, type Stay } from "@/lib/types";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import DateRangePicker from "@/components/DateRangePicker";

type ServiceAvailabilityState = {
  forDate: string;
  bySlug: Record<string, api.ServiceOptionAvailability | null>;
};

function nightsBetween(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0;
  const a = new Date(`${arrival}T00:00:00`).getTime();
  const b = new Date(`${departure}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

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
  const t = useTranslations("stayReservationForm");
  const ta = useTranslations("authForm");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const PRICING_UNIT_LABEL: Record<ServiceOptionCatalogItem["pricingUnit"], string> = {
    PER_DAY: t("unitDay"),
    PER_BOOKING: t("unitBooking"),
    PER_PERSON: t("unitPerson"),
    PER_VEHICLE: t("unitVehicle"),
  };
  // A draft snapshot of the guest's in-progress selections, so navigating to
  // an accommodation tier's own detail page ("voir détails") and coming back
  // doesn't lose what they'd already picked. sessionStorage only (per-tab,
  // gone on close) — never used for anything the server treats as
  // authoritative. Read once on mount; every read/write is defensive since a
  // private window or blocked site data can make either throw or return null.
  const draftKey = `booking-draft:${stay.slug}`;
  type BookingDraft = {
    date?: string;
    departureDate?: string;
    adults?: number;
    children?: number;
    accommodationSelections?: Record<string, number>;
    rideSlugs?: string[];
    hasOwnVehicle?: boolean | null;
    departureCity?: DepartureCity | "";
    returnCity?: DepartureCity | "";
    guideSlug?: string;
    transportSlug?: string;
  };
  function readDraft(): BookingDraft | null {
    try {
      const raw = sessionStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as BookingDraft) : null;
    } catch {
      return null;
    }
  }
  const initialDraft = typeof window !== "undefined" ? readDraft() : null;

  const [date, setDate] = useState(initialDraft?.date ?? "");
  // Only used when the back office lets this stay run several nights
  // (Stay.maxNights > 1): the guest then picks arrival AND departure.
  const [departureDate, setDepartureDate] = useState(initialDraft?.departureDate ?? "");
  const maxNights = stay.maxNights ?? 1;
  const multiNight = maxNights > 1;
  const nights = multiNight ? Math.max(1, nightsBetween(date, departureDate)) : 1;
  const [adults, setAdults] = useState(initialDraft?.adults ?? 1);
  const [children, setChildren] = useState(initialDraft?.children ?? 0);
  // slug -> quantity. A guest may pick several tiers at once (e.g. 2 Suites +
  // 3 Tentes in one booking). `initialAccommodationSlug` (from the "Réserver"
  // link on a tier's own detail page) is merged in rather than replacing
  // whatever the draft already held.
  const [accommodationSelections, setAccommodationSelections] = useState<Record<string, number>>(() => {
    const base = { ...(initialDraft?.accommodationSelections ?? {}) };
    if (initialAccommodationSlug && !(initialAccommodationSlug in base)) {
      base[initialAccommodationSlug] = 1;
    }
    return base;
  });
  const [rideSlugs, setRideSlugs] = useState<string[]>(initialDraft?.rideSlugs ?? []);

  // "Getting There & Guide" - hasOwnVehicle null = not chosen yet. Guide is
  // always offered; transport only when the guest has no vehicle. Kept as
  // two separate selections (never both a customer-vehicle guide AND a
  // transport option), matching the backend's own mutual-exclusion rule.
  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(initialDraft?.hasOwnVehicle ?? null);
  const [departureCity, setDepartureCity] = useState<DepartureCity | "">(initialDraft?.departureCity ?? "");
  // Optional return leg after the stay ends - same city list as
  // departureCity, entirely skippable.
  const [returnCity, setReturnCity] = useState<DepartureCity | "">(initialDraft?.returnCity ?? "");
  const [guideOptions, setGuideOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [transportOptions, setTransportOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [guideSlug, setGuideSlug] = useState(initialDraft?.guideSlug ?? "");
  const [transportSlug, setTransportSlug] = useState(initialDraft?.transportSlug ?? "");
  const [pickupHotelName, setPickupHotelName] = useState("");
  const [pickupAirport, setPickupAirport] = useState("");
  const [pickupFlightNumber, setPickupFlightNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupArrivalTime, setPickupArrivalTime] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [serviceAvailability, setServiceAvailability] = useState<ServiceAvailabilityState>();

  useEffect(() => {
    let cancelled = false;
    api.getServiceOptions("GUIDE").then((items) => !cancelled && setGuideOptions(items));
    api.getServiceOptions("TRANSPORT").then((items) => !cancelled && setTransportOptions(items));
    return () => {
      cancelled = true;
    };
  }, []);

  // Snapshot the draft on every relevant change. Contact details (name/email/
  // phone/notes) are deliberately excluded — no reason to linger in browser
  // storage, and they aren't lost by the "voir détails" round trip since that
  // link is reached before those fields are usually filled in.
  useEffect(() => {
    try {
      const draft: BookingDraft = {
        date,
        departureDate,
        adults,
        children,
        accommodationSelections,
        rideSlugs,
        hasOwnVehicle,
        departureCity,
        returnCity,
        guideSlug,
        transportSlug,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Best-effort only — a private window or blocked storage just means
      // the draft won't survive the round trip, not a broken form.
    }
  }, [date, departureDate, adults, children, accommodationSelections, rideSlugs, hasOwnVehicle, departureCity, returnCity, guideSlug, transportSlug, draftKey]);

  const selectedTransport = transportOptions.find((o) => o.slug === transportSlug);
  const selectedGuide = guideOptions.find((o) => o.slug === guideSlug);
  const needsPickupDetails = !!selectedTransport?.requiresPickupLocation;
  const pickupFields = new Set(selectedTransport?.pickupFields ?? []);
  const requiredPickupFields = new Set(selectedTransport?.requiredPickupFields ?? []);
  // Once the guest says they have no vehicle, a guide who'd ride in that
  // (nonexistent) vehicle makes no sense - hide it rather than let the
  // guest pick a contradiction the backend would reject anyway.
  const availableGuideOptions = hasOwnVehicle === false
    ? guideOptions.filter((o) => !o.requiresCustomerVehicle)
    : guideOptions;

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const idempotencyKeyRef = useRef("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState<{ id: string } | null>(null);
  // Keyed by the date it was fetched for, so a stale result for a changed date
  // is ignored without a setState-in-effect reset.
  const [avail, setAvail] = useState<{ forDate: string; data: StayAvailability | null; error: boolean }>();
  const toast = useToast();

  const availabilityFor = avail?.forDate === date && !avail.error ? avail.data : null;
  const availabilityLoading = !!date && avail?.forDate !== date;

  // Truthful availability from the backend when a date is picked. A null result
  // (no backend / dev) leaves every tier bookable, as before.
  useEffect(() => {
    if (!date) return;
    if (multiNight && !departureDate) return;
    const ctrl = new AbortController();
    const forDate = date;
    api
      .getStayAvailability(stay.slug, forDate, nights, ctrl.signal)
      .then((data) => {
        setAvail({ forDate, data, error: false });
        if (data?.accommodations.some((t) => t.status === "UNAVAILABLE")) {
          const unavailableSlugs = new Set(
            data.accommodations.filter((t) => t.status === "UNAVAILABLE").map((t) => t.slug),
          );
          setAccommodationSelections((cur) =>
            Object.fromEntries(Object.entries(cur).filter(([slug]) => !unavailableSlugs.has(slug))),
          );
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setAvail({ forDate, data: null, error: true });
      });
    return () => ctrl.abort();
  }, [date, departureDate, multiNight, nights, stay.slug]);

  function tierAvailability(slug: string): TierAvailability | undefined {
    return availabilityFor?.accommodations.find((t) => t.slug === slug);
  }
  function tierSoldOut(slug: string): boolean {
    return tierAvailability(slug)?.status === "UNAVAILABLE";
  }
  function refreshAvailability() {
    if (!date) return;
    const forDate = date;
    api.getStayAvailability(stay.slug, forDate, nights).then((data) =>
      setAvail({ forDate, data, error: false }),
    ).catch(() => {});
  }

  const min = todayISO();
  const partySize = adults + children;
  // Every tier the guest has checked, each with its own quantity — a guest
  // may book several at once (e.g. 2 Suites + 3 Tentes together).
  const selectedAccommodations = (accommodations ?? [])
    .filter((a) => a.slug in accommodationSelections)
    .map((a) => ({ accommodation: a, qty: accommodationSelections[a.slug] }));
  // Per unit while at least one tent/room/suite is chosen — how many units
  // count against a shared night's price is still to be confirmed with the
  // camp, so this stays a free pick rather than something derived from party
  // size. Display-only estimate, summed across every selected tier. The
  // authoritative total is computed server-side from the snapshotted
  // per-unit price — this number is never submitted (see the
  // createStayBooking payload below: slugs, qty, party, contact only).
  // With accommodation types the price is per chosen tier; without, the stay's
  // own adult/child rates from the back office. Either way it is per night.
  const adultRate = stay.adultPrice ?? stay.priceFrom;
  const childRate = stay.childPrice ?? adultRate;
  const nightly = selectedAccommodations.length > 0
    ? selectedAccommodations.reduce((sum, { accommodation, qty }) => sum + accommodation.priceFrom * qty, 0)
    : adults * adultRate + children * childRate;
  const total = nightly * nights;
  const nightsSuffix = nights > 1 ? ` · ${t("summaryNights", { nights })}` : "";

  function optionQuantity(option: ServiceOptionCatalogItem): number {
    if (option.pricingUnit === "PER_DAY") return nights;
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
  const extrasTotal = activities
    .filter((activity) => rideSlugs.includes(activity.slug))
    .reduce((sum, activity) => sum + activity.priceFrom, 0);

  const visibleSteps = [
    { id: 0, label: t("stepDateTravelers") },
    { id: 1, label: t("stepAccommodation") },
    { id: 2, label: t("stepVehicleGuide") },
    { id: 3, label: t("stepExtras") },
    { id: 4, label: t("stepReview") },
  ];

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!date) e.date = t("errorPickDate");
      else if (date < min) e.date = t("errorPastDate");
      if (multiNight && (!departureDate || nights < 1 || nights > maxNights)) {
        e.departureDate = t("errorMaxNights", { max: maxNights });
      }
    }
    if (step === 1) {
      const soldOutSelection = selectedAccommodations.find(({ accommodation }) => tierSoldOut(accommodation.slug));
      if (soldOutSelection) e.accommodationSlug = t("errorSoldOut");
    }
    if (step === 2) {
      if (hasOwnVehicle === null) e.arrivalMode = t("errorArrivalMode");
      if (stay.guideRequired && !guideSlug) e.guide = t("errorGuideRequired");
      if (hasOwnVehicle === false && !transportSlug) e.transport = t("errorTransportRequired");
      if (
        needsPickupDetails &&
        !pickupHotelName.trim() &&
        !pickupAirport.trim() &&
        !pickupAddress.trim() &&
        !pickupInstructions.trim()
      ) {
        e.pickup = t("errorPickup");
      }
      if (selectedGuide && optionUnavailable(selectedGuide)) e.guide = t("errorGuideUnavailable");
      if (selectedTransport && optionUnavailable(selectedTransport)) e.transport = t("errorTransportUnavailable");
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
    if (validateStep()) setStep((s) => Math.min(visibleSteps.length - 1, s + 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

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

  function changeAccommodationQty(slug: string, change: -1 | 1) {
    setAccommodationSelections((cur) => {
      if (!(slug in cur)) return cur;
      return { ...cur, [slug]: Math.max(1, Math.min(6, cur[slug] + change)) };
    });
  }

  function toggleAccommodation(slug: string) {
    setAccommodationSelections((cur) => {
      if (slug in cur) {
        const rest = { ...cur };
        delete rest[slug];
        return rest;
      }
      return { ...cur, [slug]: 1 };
    });
  }

  async function submit() {
    setErrors({});
    setFormError("");

    const soldOutSelection = selectedAccommodations.find(({ accommodation }) => tierSoldOut(accommodation.slug));
    if (soldOutSelection) {
      setErrors({ accommodationSlug: t("errorSoldOut") });
      return;
    }

    const newErrors: Record<string, string> = {};
    if (hasOwnVehicle === null) {
      newErrors.arrivalMode = t("errorArrivalMode");
    }
    if (stay.guideRequired && !guideSlug) {
      newErrors.guide = t("errorGuideRequired");
    }
    if (hasOwnVehicle === false && !transportSlug) {
      newErrors.transport = t("errorTransportRequired");
    }
    if (
      needsPickupDetails &&
      !pickupHotelName.trim() &&
      !pickupAirport.trim() &&
      !pickupAddress.trim() &&
      !pickupInstructions.trim()
    ) {
      newErrors.pickup = t("errorPickup");
    }
    if (selectedGuide && optionUnavailable(selectedGuide)) {
      newErrors.guide = t("errorGuideUnavailable");
    }
    if (selectedTransport && optionUnavailable(selectedTransport)) {
      newErrors.transport = t("errorTransportUnavailable");
    }
    if (!acceptedTerms) newErrors.acceptedTerms = ta("termsRequired");
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

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

    const accommodationsPayload = selectedAccommodations.map(({ accommodation, qty }) => ({
      accommodationSlug: accommodation.slug,
      quantity: qty,
    }));

    const result = await api.createStayBooking({
      staySlug: stay.slug,
      accommodations: accommodationsPayload.length > 0 ? accommodationsPayload : undefined,
      date,
      nights: multiNight ? nights : undefined,
      partySize,
      children: children > 0 ? children : undefined,
      rideSlugs,
      arrivalMode: hasOwnVehicle ? "OWN_VEHICLE" : "TRANSPORT",
      departureCity: departureCity || undefined,
      returnCity: returnCity || undefined,
      serviceOptions: serviceOptions.length > 0 ? serviceOptions : undefined,
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
      idempotencyKey: idempotencyKeyRef.current,
      acceptedTerms,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(
        result.errors ? "" : (result.message ?? t("errorGeneric")),
      );
      setSubmitting(false);
      // A capacity conflict (another guest took the last unit between the page
      // loading and this submit) — refresh the truthful availability so the UI
      // reflects it.
      if (!result.errors) refreshAvailability();
      return;
    }

    setBooking(result.data);
    setSubmitting(false);
    toast.success(t("reservedConfirmation", { id: result.data.id }));
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Nothing to clean up if storage isn't available.
    }
  }

  if (booking) {
    const rideNames = activities
      .filter((a) => rideSlugs.includes(a.slug))
      .map((a) => a.title);
    return (
      <div className="tour-booking-success" role="status">
        <span className="tour-booking-success-icon" aria-hidden="true">✓</span>
        <div>
          <p className="tour-booking-success-kicker">{t("reservedConfirmation", { id: booking.id })}</p>
          <h3>{t("reservedConfirmation", { id: booking.id })}</h3>
          <p>
            {t("reservedBody")}
            {rideNames.length > 0 && t("reservedWithRides", { rides: rideNames.join(", ") })}
          </p>
        </div>
      </div>
    );
  }

  const activeStepPosition = step;
  const activeStep = visibleSteps[activeStepPosition] ?? visibleSteps[0];

  return (
    <div className="tour-book-flow">
      <div className="stepper" aria-label={activeStep.label}>
        {visibleSteps.map((item, i) => (
          <span
            key={item.id}
            className="s"
            data-state={i === activeStepPosition ? "active" : i < activeStepPosition ? "done" : "todo"}
            aria-current={i === activeStepPosition ? "step" : undefined}
          >
            <span className="step-dot" aria-hidden="true">{i < activeStepPosition ? "✓" : i + 1}</span>
            <span className="step-label">{item.label}</span>
          </span>
        ))}
      </div>

      <div className="tour-book-step-heading">
        <span>0{activeStepPosition + 1}</span>
        <h3>{activeStep.label}</h3>
        <strong className="tour-book-step-amount">
          {step === 0 && `€${total}`}
          {step === 1 && `€${total}`}
          {step === 2 && (hasOwnVehicle === false ? t("onRequest") : t("ownVehicle"))}
          {step === 3 && `€${extrasTotal}`}
          {step === 4 && `€${total + extrasTotal + serviceTotal}`}
        </strong>
      </div>

      {step === 1 && accommodations && accommodations.length > 0 && (
        <div className="field" data-invalid={!!errors.accommodationSlug}>
          <label>{t("chooseCamp")}</label>
          <div className="ride-options">
            {accommodations.map((a) => {
              const av = tierAvailability(a.slug);
              const soldOut = av?.status === "UNAVAILABLE";
              const checked = a.slug in accommodationSelections;
              const qty = accommodationSelections[a.slug] ?? 1;
              return (
                <div key={a.slug}>
                  <label
                    className="ride-option"
                    data-disabled={soldOut || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={soldOut}
                      onChange={() => toggleAccommodation(a.slug)}
                    />
                    <span>{a.title}</span>
                    <span className="ride-price">
                      {soldOut
                        ? t("soldOutForDate")
                        : av?.status === "AVAILABLE" && av.unitsAvailable != null && av.unitsAvailable <= 3
                          ? (av.unitsAvailable === 1
                              ? t("leftFromPriceOne", { units: av.unitsAvailable, price: a.priceFrom })
                              : t("leftFromPriceOther", { units: av.unitsAvailable, price: a.priceFrom }))
                          : t("fromPrice", { price: a.priceFrom })}
                    </span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 16px 12px" }}>
                    <Link
                      href={`/camp/${stay.slug}/${a.slug}`}
                      target="_blank"
                      className="pick-details-link"
                      style={{ position: "static" }}
                    >
                      {t("viewDetails")}
                    </Link>
                  </div>
                  {checked && (
                    <div className="guest-picker" style={{ marginTop: 6, marginBottom: 10 }}>
                      <div className="guest-row">
                        <div>
                          <strong>{t("howMany")}</strong>
                          <span>{t("exactRuleNote")}</span>
                        </div>
                        <div className="guest-stepper">
                          <button
                            type="button"
                            onClick={() => changeAccommodationQty(a.slug, -1)}
                            disabled={qty === 1}
                            aria-label={t("decrease")}
                          >
                            −
                          </button>
                          <output aria-label={`${qty} ${a.title}`}>{qty}</output>
                          <button
                            type="button"
                            onClick={() => changeAccommodationQty(a.slug, 1)}
                            disabled={qty === 6}
                            aria-label={t("increase")}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {errors.accommodationSlug && <span className="err">{errors.accommodationSlug}</span>}
        </div>
      )}

      {step === 0 && (
        <div className="reserve-form" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
          {multiNight ? (
            <>
              <DateRangePicker
                arrivalId="s-date"
                departureId="s-departure-date"
                arrivalLabel={t("arrivalDateLabel")}
                departureLabel={t("departureDateLabel")}
                min={min}
                maxNights={maxNights}
                start={date}
                end={departureDate}
                onChange={(s, e) => {
                  setDate(s);
                  setDepartureDate(e);
                }}
                errorStart={errors.date}
                errorEnd={errors.departureDate}
              />
              {date && departureDate && <p className="hint">{t("nightsComputedHint", { nights })}</p>}
              {availabilityLoading && <p className="hint">{t("checkingAvailability")}</p>}
              {availabilityFor &&
                availabilityFor.accommodations.length > 0 &&
                availabilityFor.accommodations.every((a) => a.status === "UNAVAILABLE") && (
                  <p className="hint">{t("everyCampBooked")}</p>
                )}
            </>
          ) : (
            <div className="field" data-invalid={!!errors.date}>
              <label htmlFor="s-date">{t("arrivalDateLabel")}</label>
              <DatePicker id="s-date" min={min} value={date} onChange={setDate} invalid={!!errors.date} />
              {availabilityLoading && <p className="hint">{t("checkingAvailability")}</p>}
              {availabilityFor &&
                availabilityFor.accommodations.length > 0 &&
                availabilityFor.accommodations.every((a) => a.status === "UNAVAILABLE") && (
                  <p className="hint">{t("everyCampBooked")}</p>
                )}
              {errors.date && <span className="err">{errors.date}</span>}
            </div>
          )}

          <div className="field" data-invalid={!!errors.partySize}>
            <label>{t("whosComing")}</label>
            <div className="guest-picker">
              <div className="guest-row">
                <div><strong>{t("adults")}</strong><span>{t("adultsAge")}</span></div>
                <div className="guest-stepper">
                  <button type="button" onClick={() => changeGuests("adults", -1)} disabled={adults === 1} aria-label={t("decrease")}>−</button>
                  <output aria-label={`${adults} ${t("adults")}`}>{adults}</output>
                  <button type="button" onClick={() => changeGuests("adults", 1)} disabled={partySize === MAX_PARTY_SIZE} aria-label={t("increase")}>+</button>
                </div>
              </div>
              <div className="guest-row">
                <div><strong>{t("children")}</strong><span>{t("childrenAge")}</span></div>
                <div className="guest-stepper">
                  <button type="button" onClick={() => changeGuests("children", -1)} disabled={children === 0} aria-label={t("decrease")}>−</button>
                  <output aria-label={`${children} ${t("children")}`}>{children}</output>
                  <button type="button" onClick={() => changeGuests("children", 1)} disabled={partySize === MAX_PARTY_SIZE} aria-label={t("increase")}>+</button>
                </div>
              </div>
            </div>
            {errors.partySize && <span className="err">{errors.partySize}</span>}
          </div>
        </div>
      )}

      {step === 1 && (!accommodations || accommodations.length === 0) && (
        <div className="booking-empty-state">
          <span aria-hidden="true">✓</span>
          <div><strong>{t("noAccommodationChoice")}</strong></div>
        </div>
      )}

      {step === 2 && (
      <div className="field" data-invalid={!!errors.arrivalMode}>
        <label>{t("howWillYouJoin")}</label>
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
          <label className="ride-option">
            <input
              type="radio"
              name="hasOwnVehicle"
              checked={hasOwnVehicle === false}
              onChange={() => {
                setHasOwnVehicle(false);
                if (selectedGuide?.requiresCustomerVehicle) setGuideSlug("");
              }}
            />
            <span>{t("needTransport")}</span>
            <span className="ride-price">{t("needTransportHint")}</span>
          </label>
        </div>
        {errors.arrivalMode && <span className="err">{errors.arrivalMode}</span>}

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="sf-departure-city">{t("departureCityLabel")}</label>
          <select
            id="sf-departure-city"
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

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="sf-return-city">{t("returnCityLabel")}</label>
          <p className="hint">{t("returnCityHint")}</p>
          <select
            id="sf-return-city"
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

        {hasOwnVehicle !== null && (
          <div className="field" data-invalid={!!errors.guide} style={{ marginTop: 12 }}>
            <label>
              {t("chooseYourGuide")}{!stay.guideRequired && t("optionalSuffix")}
            </label>
            {availableGuideOptions.length === 0 ? (
              <p className="hint">{t("noGuideOptions")}</p>
            ) : (
              <div className="ride-options">
                {!stay.guideRequired && (
                  <label className="ride-option">
                    <input
                      type="radio"
                      name="guide"
                      checked={guideSlug === ""}
                      onChange={() => setGuideSlug("")}
                    />
                    <span>{t("noGuide")}</span>
                  </label>
                )}
                {availableGuideOptions.map((o) => {
                  const availability = optionAvailability(o);
                  const unavailable = optionUnavailable(o);
                  return (
                  <label key={o.slug} className="ride-option" data-disabled={unavailable || undefined}>
                    <input
                      type="radio"
                      name="guide"
                      checked={guideSlug === o.slug}
                      disabled={unavailable}
                      onChange={() => setGuideSlug(o.slug)}
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
      </div>
      )}

      {step === 3 && (
      <div className="field" data-invalid={!!errors.rideSlugs}>
        <label>{t("addRide")}</label>
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
        {errors.rideSlugs && <span className="err">{errors.rideSlugs}</span>}
      </div>
      )}

      {step === 4 && (
        <div className="tour-review-step">
          <div className="reserve-form tour-review-details" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
            <div className="field" data-invalid={!!errors.name}>
              <label htmlFor="s-name">{t("fullName")}</label>
              <input
                id="s-name"
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <span className="err">{errors.name}</span>}
            </div>

            <div className="field" data-invalid={!!errors.email}>
              <label htmlFor="s-email">{t("email")}</label>
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
              <label htmlFor="s-phone">{t("phone")}</label>
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
              <label htmlFor="s-notes">{t("anythingElse")}</label>
              <input
                id="s-notes"
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <p className="hint tour-review-hint">{t("reviewHint")}</p>
          <div className="summary tour-review-summary">
            <div className="row"><span className="k">{t("campLabel")}</span><span>{stay.title}</span></div>
            <div className="row"><span className="k">{t("arrivalDateLabel")}</span><span>{prettyDate(date, locale)}</span></div>
            {multiNight && departureDate && (
              <div className="row"><span className="k">{t("departureDateLabel")}</span><span>{prettyDate(departureDate, locale)}</span></div>
            )}
            {multiNight && (
              <div className="row"><span className="k">{t("nightsLabel")}</span><span>{nights}</span></div>
            )}
            <div className="row">
              <span className="k">{t("travelersLabel")}</span>
              <span>{adults} {t("adults").toLowerCase()}{children > 0 ? ` · ${children} ${t("children").toLowerCase()}` : ""}</span>
            </div>
            <div className="row"><span className="k">{t("reviewVehicleLabel")}</span><span>{hasOwnVehicle ? t("ownVehicle") : t("needTransport")}</span></div>
            {departureCity && <div className="row"><span className="k">{t("departureCityLabel")}</span><span>{DEPARTURE_CITY_LABELS[departureCity]}</span></div>}
            {returnCity && <div className="row"><span className="k">{t("returnCityLabel")}</span><span>{DEPARTURE_CITY_LABELS[returnCity]}</span></div>}
            {selectedGuide && <div className="row"><span className="k">{t("reviewGuideLabel")}</span><span>{selectedGuide.name}</span></div>}
            {needsPickupDetails && [pickupHotelName, pickupAirport, pickupFlightNumber, pickupAddress, pickupArrivalTime, pickupInstructions].some((v) => v.trim()) && (
              <div className="row">
                <span className="k">{t("pickupLabel")}</span>
                <span>{[pickupHotelName, pickupAirport, pickupFlightNumber, pickupAddress, pickupArrivalTime, pickupInstructions].filter((v) => v.trim()).join(" · ")}</span>
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
            {(email || phone) && <div className="row"><span className="k">{t("contactLabel")}</span><span>{email} · {phone}</span></div>}
            {notes && <div className="row"><span className="k">{t("notesLabelSummary")}</span><span>{notes}</span></div>}

            {selectedAccommodations.length > 0 ? (
              selectedAccommodations.map(({ accommodation, qty }) => (
                <div className="row" key={accommodation.slug}>
                  <span>{qty} × {accommodation.title}{nightsSuffix}</span>
                  <span>€{accommodation.priceFrom * qty * nights}</span>
                </div>
              ))
            ) : (
              <>
                <div className="row">
                  <span>{t("summaryAdults", { count: adults, price: adultRate })}{nightsSuffix}</span>
                  <span>€{adults * adultRate * nights}</span>
                </div>
                {children > 0 && (
                  <div className="row">
                    <span>{t("summaryChildren", { count: children, price: childRate })}{nightsSuffix}</span>
                    <span>€{children * childRate * nights}</span>
                  </div>
                )}
              </>
            )}
            {selectedGuide && (
              <div className="row">
                <span>{selectedGuide.name}</span>
                <span>{optionPrice(selectedGuide) == null ? t("onRequest") : `€${optionPrice(selectedGuide)}`}</span>
              </div>
            )}
            {selectedTransport && (
              <div className="row">
                <span>{selectedTransport.name}</span>
                <span>{optionPrice(selectedTransport) == null ? t("onRequest") : `€${optionPrice(selectedTransport)}`}</span>
              </div>
            )}
            {activities.filter((activity) => rideSlugs.includes(activity.slug)).map((activity) => (
              <div className="row" key={activity.slug}>
                <span>{activity.title}</span>
                <span>€{activity.priceFrom}</span>
              </div>
            ))}
            <div className="row total">
              <span>{t("grandTotal")}</span>
              <span>€{total + extrasTotal + serviceTotal}</span>
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
        {step < visibleSteps.length - 1 ? (
          <button type="button" className="btn-accent" onClick={next}>
            {t("continue")}
          </button>
        ) : (
          <button type="button" className="btn-accent" onClick={submit} disabled={submitting}>
            {submitting ? t("reserving") : t("reserveThisStay")}
          </button>
        )}
      </div>
      <p className="note">{t("freeCancellation")}</p>
    </div>
  );
}
