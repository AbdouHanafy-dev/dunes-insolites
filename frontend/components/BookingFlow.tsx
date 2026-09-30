"use client";

import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { useCurrency } from "@/components/CurrencyProvider";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { departureOptions, returnOptions } from "@/lib/cities";
import { formatTourDuration, tourNights } from "@/lib/tourDuration";
import TourBookingFlow from "@/components/TourBookingFlow";
import { useCallback, Fragment, useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { describeWriteFailure } from "@/lib/writeErrors";
import type { ServiceOptionAvailability, ServiceOptionCatalogItem, StayAvailability } from "@/lib/api";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import { toYearMonth } from "@/lib/dateGrid";
import AccommodationPicker from "@/components/booking/AccommodationPicker";
import { useStepScroll } from "@/lib/useStepScroll";
import GuestPicker from "@/components/booking/GuestPicker";
import { tierPerNight } from "@/lib/guestPricing";
import { activityQuantity, activityTotal, baseMinutes, canExtend, durationsPayload } from "@/lib/activityPricing";
import ActivityDurationStepper, { useSessionLabel } from "@/components/booking/ActivityDurationStepper";
import DateRangePicker from "@/components/DateRangePicker";
import ListSelect from "@/components/ListSelect";
import PhoneInput from "@/components/PhoneInput";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
import { DEFAULT_COUNTRY_BY_LOCALE } from "@/lib/countryDialCodes";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { hasInformationalAccommodation, isActivityIncludedInStay } from "@/lib/stayAccommodation";
import {
  DEPARTURE_CITY_LABELS,
  type Activity,
  type DepartureCity,
  type Stay,
  type Tour,
} from "@/lib/types";

type Category = "circuit" | "accommodation";

// Step 0's category cards show a real result's photo once tours/stays load;
// until then (or if a result is genuinely missing one), these keep the card
// from sitting blank — same static assets already used as fallbacks
// elsewhere (circuits/[slug]/page.tsx, account/page.tsx).
const CIRCUIT_FALLBACK_IMAGE = "/images/tours/depuis-tunis-2-jours-camp-sahara/01.avif";
const STAY_FALLBACK_IMAGE = "/images/camp-hero-poster.jpg";

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

function nightsBetween(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0;
  const a = new Date(`${arrival}T00:00:00`).getTime();
  const b = new Date(`${departure}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * /book's entry point: choose Circuits or Camp stays, see the matching
 * results, then walk a wizard whose steps and backend call differ by
 * category — but both funnel into the exact same public booking pipeline
 * TourBookingFlow (api.createTourBooking) and StayReservationForm
 * (api.createStayBooking) already use. Activities remain bookable only as
 * an add-on inside either flow (rideSlugs), not as a third top-level
 * category — dropped 22 Sep 2026 per explicit product decision.
 */
export default function BookingFlow({ activities }: { activities: Activity[] }) {
  const t = useTranslations("tourBookingForm");
  const { format: money } = useCurrency();
  const ts = useTranslations("stayReservationForm");
  const tb = useTranslations("bookingFlow");
  const tDuration = useTranslations("tourDuration");
  const ta = useTranslations("authForm");
  const toast = useToast();
  const locale = useLocale();
  const PRICING_UNIT_LABEL: Record<ServiceOptionCatalogItem["pricingUnit"], string> = {
    PER_DAY: ts("unitDay"),
    PER_BOOKING: ts("unitBooking"),
    PER_PERSON: ts("unitPerson"),
    PER_VEHICLE: ts("unitVehicle"),
    PER_PERSON_NIGHT: ts("unitPerson"), // tour options only; never listed in this flow
  };

  const [category, setCategory] = useState<Category | "">("");
  const [step, setStep] = useState(0);
  const flowRef = useStepScroll(step);

  // ---------- results ----------
  const [tours, setTours] = useState<Tour[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null);
  const [stayDetailLoading, setStayDetailLoading] = useState(false);

  // ---------- accommodation tier (within the selected stay) ----------
  const [accommodationSlug, setAccommodationSlug] = useState("");
  const [accommodationQty, setAccommodationQty] = useState(1);

  // ---------- dates + travelers (shared shape, category-specific meaning) ----------
  const [date, setDate] = useState(""); // arrival, both categories
  const [departureDate, setDepartureDate] = useState(""); // stay, multi-night only
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  // ---------- shared: getting there ----------
  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(null);
  const [departureCity, setDepartureCity] = useState<DepartureCity | "">("");
  const [returnCity, setReturnCity] = useState<DepartureCity | "">("");
  const [meetUpPlace, setMeetUpPlace] = useState("");

  // ---------- stay-only: transport catalogue ----------
  const [transportOptions, setTransportOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [transportSlug, setTransportSlug] = useState("");
  const [pickupHotelName, setPickupHotelName] = useState("");
  const [pickupAirport, setPickupAirport] = useState("");
  const [pickupFlightNumber, setPickupFlightNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupArrivalTime, setPickupArrivalTime] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [serviceAvailability, setServiceAvailability] = useState<{
    forDate: string;
    bySlug: Record<string, ServiceOptionAvailability | null>;
  }>();
  const [stayAvail, setStayAvail] = useState<{ forDate: string; data: StayAvailability | null }>();

  // ---------- shared: extras (other activities) ----------
  const [rideSlugs, setRideSlugs] = useState<string[]>([]);
  // Minutes picked per timed activity (absent = its base duration).
  const [durations, setDurations] = useState<Record<string, number>>({});
  const sessionLabel = useSessionLabel();
  const minutesFor = (a: Activity) => durations[a.slug] ?? baseMinutes(a);
  const durationNote = (a: Activity) => (minutesFor(a) !== baseMinutes(a) ? " · " + sessionLabel(minutesFor(a)) : "");

  // ---------- shared: contact ----------
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<Country>(() => (DEFAULT_COUNTRY_BY_LOCALE[locale] ?? "TN") as Country);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const idempotencyKeyRef = useRef("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  // A picked arrival mode settles the errors raised about it earlier.
  const clearArrivalErrors = () => setErrors((cur) => { const next = { ...cur }; delete next.arrivalMode; delete next.transport; return next; });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  const min = todayISO();
  const maxNights = selectedStay?.maxNights ?? 1;
  const multiNight = maxNights > 1;

  // A preview photo for each category card on step 0, from the same real
  // catalogue the results step uses — fetched eagerly (not gated on picking
  // a category) so the card isn't left blank before the guest chooses.
  useEffect(() => {
    let cancelled = false;
    api.getTours(locale).then((items) => !cancelled && setTours((cur) => (cur.length ? cur : items)));
    api.getStays(locale).then((items) => !cancelled && setStays((cur) => (cur.length ? cur : items)));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Results, per chosen category.
  useEffect(() => {
    if (category === "circuit") {
      let cancelled = false;
      api.getTours(locale).then((items) => !cancelled && setTours(items))
        .finally(() => !cancelled && setResultsLoaded(true));
      return () => { cancelled = true; };
    }
    if (category === "accommodation") {
      let cancelled = false;
      api.getStays(locale).then((items) => !cancelled && setStays(items))
        .finally(() => !cancelled && setResultsLoaded(true));
      return () => { cancelled = true; };
    }
  }, [category, locale]);

  // Stay's transport catalogue.
  useEffect(() => {
    let cancelled = false;
    api.getServiceOptions("TRANSPORT").then((items) => !cancelled && setTransportOptions(items));
    return () => { cancelled = true; };
  }, []);

  const nights = multiNight ? Math.max(1, nightsBetween(date, departureDate)) : 1;
  // Stay tier + service-option availability for the chosen arrival date,
  // across the full [date, date + nights) span for multi-night stays.
  useEffect(() => {
    const availabilityStaySlug = category === "accommodation" ? selectedStay?.slug : null;
    if (!availabilityStaySlug || !date) return;
    if (category === "accommodation" && multiNight && !departureDate) return;
    const ctrl = new AbortController();
    api.getStayAvailability(availabilityStaySlug, date, nights, ctrl.signal)
      .then((data) => !ctrl.signal.aborted && setStayAvail({ forDate: date, data }))
      .catch(() => {});
    Promise.all(
      transportOptions.map(async (o) => [o.slug, await api.getServiceOptionAvailability(o.slug, date, ctrl.signal)] as const),
    ).then((entries) => {
      if (!ctrl.signal.aborted) setServiceAvailability({ forDate: date, bySlug: Object.fromEntries(entries) });
    }).catch(() => {});
    return () => ctrl.abort();
  }, [category, selectedStay, date, departureDate, multiNight, nights, transportOptions]);

  const otherActivities = activities;
  // The bivouac's own rate already includes a camel trek out to the camp - don't
  // offer it again as a paid add-on, and never total or submit it as one even if
  // it was checked before the guest switched from the fixed camp to the bivouac.
  const visibleActivities = otherActivities.filter((a) => !isActivityIncludedInStay(selectedStay, a.slug));
  const effectiveRideSlugs = rideSlugs.filter((s) => !isActivityIncludedInStay(selectedStay, s));

  const [activityAvailability, setActivityAvailability] = useState<{
    forDate: string;
    bySlug: Record<string, api.ActivityAvailability | null>;
  }>();
  useEffect(() => {
    if (category !== "accommodation" || !date) return;
    const ctrl = new AbortController();
    Promise.all(
      otherActivities.map(async (a) => [a.slug, await api.getActivityAvailability(a.slug, date, ctrl.signal)] as const),
    ).then((entries) => {
      if (!ctrl.signal.aborted) setActivityAvailability({ forDate: date, bySlug: Object.fromEntries(entries) });
    }).catch(() => {});
    return () => ctrl.abort();
  }, [category, date, otherActivities]);

  function activityUnavailable(activity: Activity): boolean {
    if (activityAvailability?.forDate !== date) return false;
    return activityAvailability.bySlug[activity.slug]?.status === "UNAVAILABLE";
  }
  const availableAccommodations = selectedStay?.accommodations ?? [];
  const informationalAccommodation = !!selectedStay && hasInformationalAccommodation(selectedStay);
  const selectedAccommodation = informationalAccommodation
    ? undefined
    : availableAccommodations.find((a) => a.slug === accommodationSlug);

  // Which days of the currently-open calendar month are fully booked across
  // every tier - greys them out before the guest picks one.
  const [viewMonth, setViewMonth] = useState("");
  const [monthAvailability, setMonthAvailability] = useState<{ key: string; dates: Set<string> }>({ key: "", dates: new Set() });
  const monthAvailabilityKey = selectedStay && viewMonth
    ? `${selectedStay.slug}:${viewMonth}:${nights}`
    : "";
  const monthUnavailable = monthAvailability.key === monthAvailabilityKey
    ? monthAvailability.dates
    : new Set<string>();
  useEffect(() => {
    if (category !== "accommodation" || !selectedStay || !viewMonth || informationalAccommodation) return;
    const ctrl = new AbortController();
    api.getStayAvailabilityRange(selectedStay.slug, viewMonth, nights, ctrl.signal)
      .then((days) => {
        if (ctrl.signal.aborted) return;
        setMonthAvailability({ key: `${selectedStay.slug}:${viewMonth}:${nights}`, dates: new Set(
          days
            .filter((d) => d.accommodations.length > 0 && d.accommodations.every((a) => a.status === "UNAVAILABLE"))
            .map((d) => d.date),
        ) });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [category, selectedStay, viewMonth, nights, informationalAccommodation]);
  const partySize = adults + children;

  const selectedTransport = transportOptions.find((o) => o.slug === transportSlug);
  const needsPickupDetails = !!selectedTransport?.requiresPickupLocation;
  const pickupFields = new Set(selectedTransport?.pickupFields ?? []);
  const requiredPickupFields = new Set(selectedTransport?.requiredPickupFields ?? []);

  function optionQuantity(option: ServiceOptionCatalogItem): number {
    if (option.pricingUnit === "PER_PERSON") return partySize;
    if (option.pricingUnit === "PER_DAY") return nights;
    return 1;
  }
  function optionAvailability(option: ServiceOptionCatalogItem) {
    return serviceAvailability?.forDate === date ? serviceAvailability.bySlug[option.slug] : undefined;
  }
  function optionUnavailable(option: ServiceOptionCatalogItem): boolean {
    const availability = optionAvailability(option);
    return availability?.status === "UNAVAILABLE"
      || (availability?.unitsAvailable != null && availability.unitsAvailable < optionQuantity(option));
  }
  function optionPrice(option: ServiceOptionCatalogItem): number | null {
    return option.priceTtc == null ? null : option.priceTtc * optionQuantity(option);
  }
  const serviceTotal = selectedTransport ? optionPrice(selectedTransport) ?? 0 : 0;

  function tierAvailability(slug: string) {
    return stayAvail?.forDate === date ? stayAvail.data?.accommodations.find((a) => a.slug === slug) : undefined;
  }
  function tierSoldOut(slug: string): boolean {
    return tierAvailability(slug)?.status === "UNAVAILABLE";
  }

  // "From €X" for the dates/travelers and accommodation-type steps, before a
  // tier is actually chosen — the lowest per-night price among this stay's
  // tiers that aren't sold out for the picked dates (or, before dates are
  // picked, among all of them). Falls back to the stay's own base price when
  // it has no tiers at all (e.g. the bivouac).
  const stayFromPrice = (() => {
    const tierPrices = (informationalAccommodation ? [] : selectedStay?.accommodations ?? [])
      .filter((a) => !tierSoldOut(a.slug))
      .map((a) => a.priceFrom);
    if (tierPrices.length > 0) return Math.min(...tierPrices);
    return selectedStay?.priceFrom ?? 0;
  })();

  const extrasTotal = otherActivities.filter((a) => effectiveRideSlugs.includes(a.slug)).reduce((s, a) => s + activityTotal(a, partySize, nights, minutesFor(a)), 0);

  // No tier chosen (stay without accommodation types): the stay's own adult and
  // child rates from the back office, per person, per night.
  const stayAdultRate = selectedStay?.adultPrice ?? selectedStay?.priceFrom ?? 0;
  const stayChildRate = selectedStay?.childPrice ?? stayAdultRate;
  const stayInfantRate = selectedStay?.infantPrice ?? 0;
  const stayNightly = selectedAccommodation
    ? tierPerNight(selectedAccommodation, { adults, children, infants })
    : stayAdultRate * adults + stayChildRate * children + stayInfantRate * infants;
  const stayTotal = stayNightly * nights;
  const stayHasTiers = !informationalAccommodation && (selectedStay?.accommodations?.length ?? 0) > 0;
  const nightsSuffix = nights > 1 ? ` · ${ts("summaryNights", { nights })}` : "";

  function toggleRide(slug: string) {
    setRideSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }
  function composePhone(): string {
    let dial = "";
    try {
      dial = `+${getCountryCallingCode(phoneCountry)}`;
    } catch {
      dial = "";
    }
    return `${dial} ${phone.trim()}`.trim();
  }

  async function selectStay(stay: Stay) {
    setStayDetailLoading(true);
    const full = await api.getStay(stay.slug, locale);
    const selected = full ?? stay;
    setSelectedStay(selected);
    // Each product offers its own cities: never carry one over.
    setDepartureCity("");
    setReturnCity("");
    setAccommodationSlug("");
    setAccommodationQty(1);
    setStayDetailLoading(false);
  }

  // Steps: 0 category, 1 results, then category-specific steps. The camp
  // accommodation step is inserted for circuits configured to sleep at Sabria.
  // — dates decide the nights count, which the tier's per-night price and
  // its live availability both depend on, so it can't come before them.
  const STEPS =
    category === "circuit"
      ? [
          tb("stepCategory"),
          tb("stepResults"),
          t("stepDateTravelers"),
          t("stepGuide"),
          t("stepCities"),
          t("stepExtras"),
          t("stepReview"),
        ]
      : category === "accommodation"
        ? [tb("stepCategory"), tb("stepResults"), ts("stepDateTravelers"), ts("stepAccommodation"), ts("stepVehicleGuide"), ts("stepExtras"), ts("stepReview")]
        : [tb("stepCategory")];
  const lastStep = STEPS.length - 1;

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (step === 0 && !category) e.category = tb("errorPickCategory");

    if (step === 1) {
      if (category === "circuit" && !selectedTour) e.result = tb("errorPickResult");
      if (category === "accommodation" && !selectedStay) e.result = tb("errorPickResult");
    }


    if (category === "accommodation" && step === 2) {
      if (!date) e.date = t("errorPickDate");
      else if (date < min) e.date = t("errorPastDate");
      if (multiNight) {
        if (!departureDate) e.departureDate = ts("errorMaxNights", { max: maxNights });
        else if (nights < 1 || nights > maxNights) e.departureDate = ts("errorMaxNights", { max: maxNights });
      }
      if (adults < 1) e.adults = t("errorAtLeastOneAdult");
    }
    if (category === "accommodation" && step === 3) {
      const hasTiers = !informationalAccommodation && (selectedStay?.accommodations?.length ?? 0) > 0;
      if (hasTiers && !accommodationSlug) e.accommodation = tb("errorPickResult");
      else if (accommodationSlug && tierSoldOut(accommodationSlug)) e.accommodation = ts("errorSoldOut");
    }
    if (category === "accommodation" && step === 4) {
      if (hasOwnVehicle === null) e.arrivalMode = ts("errorArrivalMode");
      if (hasOwnVehicle === false && transportOptions.length > 0 && !transportSlug) e.transport = ts("errorTransportRequired");
      if (needsPickupDetails && !pickupHotelName.trim() && !pickupAirport.trim() && !pickupAddress.trim() && !pickupInstructions.trim()) {
        e.pickup = ts("errorPickup");
      }
      if (selectedTransport && optionUnavailable(selectedTransport)) e.transport = ts("errorTransportUnavailable");
    }
    if (category === "accommodation" && step === lastStep) {
      if (!name.trim()) e.name = t("errorName");
      if (!email.trim()) e.email = t("errorEmail");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t("errorEmailInvalid");
      if (!phone.trim()) e.phone = t("errorPhone");
      if (!acceptedTerms) e.acceptedTerms = ta("termsRequired");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step, category, selectedTour, selectedStay, accommodationSlug, date, min, adults, multiNight, departureDate,
    nights, maxNights, hasOwnVehicle, name, email, phone,
    acceptedTerms, transportSlug, needsPickupDetails, pickupHotelName, pickupAirport, pickupAddress,
    pickupInstructions, selectedTransport, informationalAccommodation,
  ]);

  function next() {
    if (validateStep()) {
      setStep((s) => Math.min(lastStep, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitStay() {
    if (!validateStep() || !selectedStay) return;
    setSubmitting(true);
    setFormError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    const serviceOptions = transportSlug
      ? [{
          serviceOptionSlug: transportSlug,
          quantity: selectedTransport ? optionQuantity(selectedTransport) : 1,
          pickupHotelName: pickupHotelName.trim() || undefined,
          pickupAirport: pickupAirport.trim() || undefined,
          pickupFlightNumber: pickupFlightNumber.trim() || undefined,
          pickupAddress: pickupAddress.trim() || undefined,
          pickupArrivalTime: pickupArrivalTime.trim() || undefined,
          pickupInstructions: pickupInstructions.trim() || undefined,
        }]
      : [];

    const result = await api.createStayBooking({
      staySlug: selectedStay.slug,
      accommodations: accommodationSlug
        ? [{ accommodationSlug, quantity: accommodationQty }]
        : undefined,
      date,
      nights,
      partySize,
      children: children > 0 ? children : undefined,
      infants: infants > 0 ? infants : undefined,
      rideSlugs: effectiveRideSlugs,
      activityDurations: durationsPayload(otherActivities, effectiveRideSlugs, durations),
      arrivalMode: hasOwnVehicle ? "OWN_VEHICLE" : "TRANSPORT",
      departureCity: hasOwnVehicle === false ? departureCity || undefined : undefined,
      returnCity: hasOwnVehicle === false ? returnCity || undefined : undefined,
      meetUpPlace: hasOwnVehicle === false && meetUpPlace.trim() ? meetUpPlace.trim() : undefined,
      serviceOptions: serviceOptions.length > 0 ? serviceOptions : undefined,
      name,
      email,
      phone: composePhone(),
      notes: notes.trim() || undefined,
      idempotencyKey: idempotencyKeyRef.current,
      acceptedTerms,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(describeWriteFailure(result, ts("errorGeneric")));
      setSubmitting(false);
      return;
    }
    setBooking(result.data);
    setSubmitting(false);
    toast.success(ts("reservedConfirmation", { id: result.data.id }));
  }

  function submit() {
    if (category === "accommodation") return submitStay();
  }

  if (booking) {
    return (
      <div className="tour-booking-success" role="status">
        <span className="tour-booking-success-icon" aria-hidden="true">✓</span>
        <div>
          <p className="tour-booking-success-kicker">{t("successPendingLabel")}</p>
          <h3>
            {category === "circuit"
              ? t("reservedConfirmation", { id: booking.id })
              : ts("reservedConfirmation", { id: booking.id })}
          </h3>
          <p>{category === "circuit" ? t("reservedBody", { id: booking.id }) : ts("reservedBody")}</p>
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

  // Once a circuit is chosen, the rest is the SAME form as on the circuit's own page, so the two can
  // never drift apart: it shows the type and the choice as done steps and comes back here on "Back".
  if (category === "circuit" && step >= 2 && selectedTour) {
    return (
      <TourBookingFlow
        tourSlug={selectedTour.slug}
        tourTitle={selectedTour.title}
        adultPrice={selectedTour.passengerAdultPrice}
        childPrice={selectedTour.passengerChildPrice}
        infantPrice={selectedTour.passengerInfantPrice}
        nights={tourNights(selectedTour.durationHours)}
        departureCities={selectedTour.departureCities}
        returnCities={selectedTour.returnCities}
        embedded={{ leadingSteps: [tb("stepCategory"), tb("stepResults")], onBackToChoice: () => setStep(1) }}
      />
    );
  }

  return (
    <div className="tour-book-flow" ref={flowRef}>
      <div className="stepper" aria-label={STEPS[step]} style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
        {STEPS.map((label, i) => (
          <span key={label + i} className="s" data-state={i === step ? "active" : i < step ? "done" : "todo"} aria-current={i === step ? "step" : undefined}>
            <span className="step-dot" aria-hidden="true">{i < step ? "✓" : i + 1}</span>
            <span className="step-label">{label}</span>
          </span>
        ))}
      </div>

      <div className="tour-book-step-heading">
        <span>0{step + 1}</span>
        <h3>{STEPS[step]}</h3>
        <strong className="tour-book-step-amount">
          {step === 0 && ""}
          {step === 1 && category === "circuit" && selectedTour && `${money(selectedTour.priceFrom)}`}
          {step === 1 && category === "accommodation" && selectedStay && `${money(selectedStay.priceFrom)}`}
          {category === "accommodation" && step === 2 && (stayHasTiers ? <PriceText text={ts("fromPrice", { price: priceToken(stayFromPrice)})} /> : `${money(stayTotal)}`)}
          {category === "accommodation" && step === 3 && (selectedAccommodation || !stayHasTiers ? `${money(stayTotal)}` : <PriceText text={ts("fromPrice", { price: priceToken(stayFromPrice)})} />)}
          {category === "accommodation" && step === 4 && (hasOwnVehicle === false ? ts("onRequest") : ts("ownVehicle"))}
          {category === "accommodation" && step === 5 && `${money(extrasTotal)}`}
          {category === "accommodation" && step === lastStep && `${money(stayTotal + extrasTotal + serviceTotal)}`}
        </strong>
      </div>

      {/* ---------- 0. category ---------- */}
      {step === 0 && (
        <>
          <p className="hint">{tb("categoryHint")}</p>
          <div className="picker" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button
              type="button"
              className="pick"
              aria-pressed={category === "circuit"}
              onClick={() => {
                setCategory("circuit");
                setSelectedTour(null);
                setSelectedStay(null);
                setAccommodationSlug("");
                setAccommodationQty(1);
                setResultsLoaded(false);
              }}
            >
              <div className="thumb">
                <Image
                  src={isDisplayableImageSrc(tours[0]?.coverImage) ? tours[0].coverImage : CIRCUIT_FALLBACK_IMAGE}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              </div>
              <div className="meta">
                <h3>{tb("circuitsLabel")}</h3>
                <p>{tb("circuitsHint")}</p>
              </div>
            </button>
            <button
              type="button"
              className="pick"
              aria-pressed={category === "accommodation"}
              onClick={() => {
                setCategory("accommodation");
                setSelectedTour(null);
                setSelectedStay(null);
                setAccommodationSlug("");
                setAccommodationQty(1);
                setResultsLoaded(false);
              }}
            >
              <div className="thumb">
                <Image
                  src={isDisplayableImageSrc(stays[0]?.image) ? stays[0].image : STAY_FALLBACK_IMAGE}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              </div>
              <div className="meta">
                <h3>{tb("accommodationsLabel")}</h3>
                <p>{tb("accommodationsHint")}</p>
              </div>
            </button>
          </div>
          {errors.category && <div className="alert">{errors.category}</div>}
        </>
      )}

      {/* ---------- 1. results ---------- */}
      {step === 1 && category === "circuit" && (
        <>
          <p className="hint">{tb("resultsHint")}</p>
          {!resultsLoaded ? (
            <p className="hint">{tb("resultsHint")}</p>
          ) : (
            <div className="picker">
              {tours.map((tour) => (
                <div key={tour.slug} style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="pick"
                    aria-pressed={selectedTour?.slug === tour.slug}
                    onClick={() => {
                      setSelectedTour(tour);
                      setDepartureCity("");
                      setReturnCity("");
                      setAccommodationSlug("");
                      setAccommodationQty(1);
                    }}
                  >
                    <div className="thumb">
                      {isDisplayableImageSrc(tour.coverImage) && <Image src={tour.coverImage} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />}
                    </div>
                    <div className="meta">
                      <h3>{tour.title}</h3>
                      <p>{formatTourDuration(tDuration, tour)}</p>
                      <span className="price">{t("estimatedTotal")} {money(tour.priceFrom)}</span>
                    </div>
                  </button>
                  <Link
                    href={`/circuits/${tour.slug}`}
                    target="_blank"
                    className="pick-details-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tb("viewDetails")}
                  </Link>
                </div>
              ))}
            </div>
          )}
          {errors.result && <div className="alert">{errors.result}</div>}
        </>
      )}

      {step === 1 && category === "accommodation" && (
        <>
          <p className="hint">{tb("resultsHint")}</p>
          {!resultsLoaded ? (
            <p className="hint">{tb("resultsHint")}</p>
          ) : (
            <div className="picker">
              {stays.map((stay) => (
                <div key={stay.slug} style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="pick"
                    aria-pressed={selectedStay?.slug === stay.slug}
                    onClick={() => selectStay(stay)}
                  >
                    <div className="thumb">
                      {isDisplayableImageSrc(stay.image) && <Image src={stay.image} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />}
                    </div>
                    <div className="meta">
                      <h3>{stay.title}</h3>
                      <p>{stay.tagline}</p>
                      <span className="price">{<PriceText text={ts("fromPrice", { price: priceToken(stay.priceFrom)})} />}</span>
                    </div>
                  </button>
                  <Link
                    href={`/camp/${stay.slug}`}
                    target="_blank"
                    className="pick-details-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tb("viewDetails")}
                  </Link>
                </div>
              ))}
            </div>
          )}
          {stayDetailLoading && <p className="hint">{ts("checkingAvailability")}</p>}
        </>
      )}

      {/* ---------- accommodation: 2. dates + travelers ---------- */}
      {category === "accommodation" && step === 2 && (
        <div className="reserve-form" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
          {!multiNight && (
            <div className="field" data-invalid={!!errors.date}>
              <label htmlFor="bf-arrival-date">{ts("arrivalDateLabel")}</label>
              <DatePicker
                id="bf-arrival-date"
                min={min}
                value={date}
                onChange={setDate}
                invalid={!!errors.date}
                unavailable={monthUnavailable}
                onMonthChange={(vm) => setViewMonth(toYearMonth(vm))}
              />
              {errors.date && <span className="err">{errors.date}</span>}
            </div>
          )}

          {multiNight && (
            <>
              <DateRangePicker
                arrivalId="bf-arrival-date"
                departureId="bf-departure-date"
                arrivalLabel={ts("arrivalDateLabel")}
                departureLabel={ts("departureDateLabel")}
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
                unavailable={monthUnavailable}
                onMonthChange={(vm) => setViewMonth(toYearMonth(vm))}
              />
              {date && departureDate && (
                <p className="hint">{ts("nightsComputedHint", { nights })}</p>
              )}
            </>
          )}

          <GuestPicker
            adults={adults}
            kids={children}
            infants={infants}
            error={errors.adults}
            onChange={(a, c, n) => {
              setAdults(a);
              setChildren(c);
              setInfants(n);
            }}
          />
        </div>
      )}

      {/* ---------- accommodation: 3. accommodation type ---------- */}
      {category === "accommodation" && step === 3 && (
        <>
          {selectedStay && selectedStay.accommodations && selectedStay.accommodations.length > 0 ? (
            <>
              {!informationalAccommodation && <p className="hint">{ts("chooseCamp")}</p>}
              <AccommodationPicker
                name="stayAccommodation"
                mode="single"
                items={selectedStay.accommodations}
                selections={accommodationSlug ? { [accommodationSlug]: accommodationQty } : {}}
                onChange={(next) => {
                  const first = Object.entries(next)[0];
                  if (first) {
                    setAccommodationSlug(first[0]);
                    setAccommodationQty(first[1]);
                  }
                }}
                availability={tierAvailability}
                detailsHref={(slug) => `/camp/${selectedStay.slug}/${slug}`}
                informational={informationalAccommodation}
              />
              {errors.accommodation && <div className="alert">{errors.accommodation}</div>}
            </>
          ) : (
            <div className="booking-empty-state">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{ts("noAccommodationChoice")}</strong>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- accommodation: 4. vehicle + guide ---------- */}
      {category === "accommodation" && step === 4 && (
        <div className="field" data-invalid={!!errors.arrivalMode}>
          <label>{ts("howWillYouJoin")}</label>
          <div className="ride-options">
            <label className="ride-option">
              <input type="radio" name="hasOwnVehicle" checked={hasOwnVehicle === true} onChange={() => { setHasOwnVehicle(true); clearArrivalErrors(); setTransportSlug(""); }} />
              <span>{ts("ownVehicle")}</span>
              <span className="ride-price">{ts("ownVehicleHint")}</span>
            </label>
            <label className="ride-option">
              <input type="radio" name="hasOwnVehicle" checked={hasOwnVehicle === false} onChange={() => { setHasOwnVehicle(false); clearArrivalErrors(); }} />
              <span>{ts("needTransport")}</span>
              <span className="ride-price">{ts("needTransportHint")}</span>
            </label>
          </div>
          {errors.arrivalMode && <span className="err">{errors.arrivalMode}</span>}
          {hasOwnVehicle === false && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="bf-s-meet-up-place">{ts("meetUpPlaceLabel")}</label>
              <p className="hint">{ts("meetUpPlaceHint")}</p>
              <input
                id="bf-s-meet-up-place"
                maxLength={255}
                placeholder={ts("meetUpPlacePlaceholder")}
                value={meetUpPlace}
                onChange={(e) => setMeetUpPlace(e.target.value)}
              />
            </div>
          )}

          {hasOwnVehicle === false && (
            <>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="bf-s-departure-city">{ts("departureCityLabel")}</label>
              <ListSelect
                id="bf-s-departure-city"
                value={departureCity}
                onChange={setDepartureCity}
                options={departureOptions(selectedStay?.departureCities)}
                labels={DEPARTURE_CITY_LABELS}
                placeholder={ts("departureCityPlaceholder")}
              />
            </div>
            {returnOptions(selectedStay?.returnCities).length > 0 && (
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="bf-s-return-city">{ts("returnCityLabel")}</label>
              <p className="hint">{ts("returnCityHint")}</p>
              <ListSelect
                id="bf-s-return-city"
                value={returnCity}
                onChange={setReturnCity}
                options={returnOptions(selectedStay?.returnCities)}
                labels={DEPARTURE_CITY_LABELS}
                placeholder={ts("returnCityPlaceholder")}
              />
            </div>
            )}
            </>
          )}

          {hasOwnVehicle === false && (
            <div className="field" data-invalid={!!errors.transport} style={{ marginTop: 16 }}>
              <label>{ts("transportation")}</label>
              {transportOptions.length === 0 ? (
                <p className="hint">{ts("noTransportOptions")}</p>
              ) : (
                <div className="ride-options">
                  {transportOptions.map((o) => {
                    const unavailable = optionUnavailable(o);
                    return (
                      <label key={o.slug} className="ride-option" data-disabled={unavailable || undefined}>
                        <input type="radio" name="transport" checked={transportSlug === o.slug} disabled={unavailable} onChange={() => setTransportSlug(o.slug)} />
                        <span className="service-option-copy">
                          <strong>{o.name}</strong>
                          {o.description && <small>{o.description}</small>}
                        </span>
                        <span className="ride-price">
                          {unavailable ? ts("unavailable") : o.priceTtc == null ? ts("contactUsShort") : <PriceText text={ts("pricePerUnit", { price: priceToken(o.priceTtc), unit: PRICING_UNIT_LABEL[o.pricingUnit] })} />}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.transport && <span className="err">{errors.transport}</span>}

              {needsPickupDetails && (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {pickupFields.has("HOTEL_NAME") && <input placeholder={ts("pickupHotelPlaceholder")} required={requiredPickupFields.has("HOTEL_NAME")} value={pickupHotelName} onChange={(e) => setPickupHotelName(e.target.value)} />}
                  {pickupFields.has("AIRPORT") && <input placeholder={ts("pickupAirportPlaceholder")} required={requiredPickupFields.has("AIRPORT")} value={pickupAirport} onChange={(e) => setPickupAirport(e.target.value)} />}
                  {pickupFields.has("FLIGHT_NUMBER") && <input placeholder={ts("pickupFlightPlaceholder")} required={requiredPickupFields.has("FLIGHT_NUMBER")} value={pickupFlightNumber} onChange={(e) => setPickupFlightNumber(e.target.value)} />}
                  {pickupFields.has("ADDRESS") && <input placeholder={ts("pickupAddressPlaceholder")} required={requiredPickupFields.has("ADDRESS")} value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />}
                  {pickupFields.has("ARRIVAL_TIME") && <input placeholder={ts("pickupArrivalTimePlaceholder")} required={requiredPickupFields.has("ARRIVAL_TIME")} value={pickupArrivalTime} onChange={(e) => setPickupArrivalTime(e.target.value)} />}
                  {pickupFields.has("INSTRUCTIONS") && <input placeholder={ts("pickupInstructionsPlaceholder")} required={requiredPickupFields.has("INSTRUCTIONS")} value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} />}
                  {errors.pickup && <span className="err">{errors.pickup}</span>}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ---------- accommodation: 5. activities ---------- */}
      {category === "accommodation" && step === 5 && (
        <div className="field">
          <label>{ts("addRide")}</label>
          <div className="ride-options">
            {visibleActivities.map((a) => {
              const unavailable = activityUnavailable(a);
              return (
              <Fragment key={a.slug}>
<label className="ride-option" data-disabled={unavailable || undefined}>
                <input
                  type="checkbox"
                  checked={rideSlugs.includes(a.slug)}
                  disabled={unavailable}
                  onChange={() => toggleRide(a.slug)}
                />
                <span>{a.title}</span>
                <span className="ride-price">
                  {unavailable
                    ? ts("unavailable")
                    : <PriceText text={ts("fromPrice", { price: priceToken(a.priceFrom)})} />}
                </span>
              </label>
{rideSlugs.includes(a.slug) && canExtend(a) && (
<ActivityDurationStepper activity={a} minutes={minutesFor(a)} onChange={(m) => setDurations((cur) => ({ ...cur, [a.slug]: m }))} />
)}
</Fragment>
              );
            })}
          </div>
          <p className="hint">{ts("confirmOnSite")}</p>
        </div>
      )}

      {/* ---------- accommodation: review ---------- */}
      {category === "accommodation" && step === lastStep && (
        <div className="tour-review-step">
          <div className="reserve-form tour-review-details" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
            <div className="field" data-invalid={!!errors.name}>
              <label htmlFor="bf-s-name">{ts("fullName")}</label>
              <input id="bf-s-name" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
              {errors.name && <span className="err">{errors.name}</span>}
            </div>
            <div className="field" data-invalid={!!errors.email}>
              <label htmlFor="bf-s-email">{ts("email")}</label>
              <input id="bf-s-email" type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <span className="err">{errors.email}</span>}
            </div>
            <div className="field" data-invalid={!!errors.phone}>
              <label htmlFor="bf-s-phone">{ts("phone")}</label>
              <PhoneInput id="bf-s-phone" country={phoneCountry} onCountryChange={setPhoneCountry} value={phone} onChange={setPhone} invalid={!!errors.phone} searchPlaceholder={tb("phoneSearchPlaceholder")} />
              {errors.phone && <span className="err">{errors.phone}</span>}
            </div>
            <div className="field">
              <label htmlFor="bf-s-notes">{ts("anythingElse")}</label>
              <input id="bf-s-notes" placeholder={ts("notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="summary tour-review-summary">
            <div className="row"><span className="k">{ts("campLabel")}</span><span>{selectedStay?.title}</span></div>
            {selectedAccommodation && (
              <div className="row">
                <span className="k">{ts("accommodationLabel")}</span>
                <span>{selectedAccommodation.title}{accommodationQty > 1 ? ` × ${accommodationQty}` : ""}</span>
              </div>
            )}
            <div className="row"><span className="k">{ts("arrivalDateLabel")}</span><span>{prettyDate(date, locale)}</span></div>
            {multiNight && departureDate && (
              <div className="row"><span className="k">{ts("departureDateLabel")}</span><span>{prettyDate(departureDate, locale)}</span></div>
            )}
            {multiNight && (
              <div className="row"><span className="k">{ts("nightsLabel")}</span><span>{nights}</span></div>
            )}
            <div className="row">
              <span className="k">{t("travelersLabel")}</span>
              <span>{adults} {ts("adults").toLowerCase()}{children > 0 ? ` · ${children} ${ts("children").toLowerCase()}` : ""}{infants > 0 ? ` · ${infants} ${ts("infants").toLowerCase()}` : ""}</span>
            </div>
            <div className="row"><span className="k">{t("reviewVehicleLabel")}</span><span>{hasOwnVehicle ? ts("ownVehicle") : ts("needTransport")}</span></div>
            {hasOwnVehicle === false && departureCity && <div className="row"><span className="k">{ts("departureCityLabel")}</span><span>{DEPARTURE_CITY_LABELS[departureCity]}</span></div>}
            {hasOwnVehicle === false && returnCity && <div className="row"><span className="k">{ts("returnCityLabel")}</span><span>{DEPARTURE_CITY_LABELS[returnCity]}</span></div>}
            {needsPickupDetails && [pickupHotelName, pickupAirport, pickupFlightNumber, pickupAddress, pickupArrivalTime, pickupInstructions].some((v) => v.trim()) && (
              <div className="row">
                <span className="k">{t("pickupLabel")}</span>
                <span>{[pickupHotelName, pickupAirport, pickupFlightNumber, pickupAddress, pickupArrivalTime, pickupInstructions].filter((v) => v.trim()).join(" · ")}</span>
              </div>
            )}
            {(email || phone) && <div className="row"><span className="k">{t("contactLabel")}</span><span>{email} · {composePhone()}</span></div>}
            {notes && <div className="row"><span className="k">{t("notesLabelSummary")}</span><span>{notes}</span></div>}

            {selectedAccommodation ? (
              <div className="row">
                <span>{selectedAccommodation.title}{nightsSuffix}</span>
                <span>{money(stayTotal)}</span>
              </div>
            ) : (
              <>
                <div className="row">
                  <span>{<PriceText text={ts("summaryAdults", { count: adults, price: priceToken(stayAdultRate)})} />}{nightsSuffix}</span>
                  <span>{money(stayAdultRate * adults * nights)}</span>
                </div>
                {children > 0 && (
                  <div className="row">
                    <span>{<PriceText text={ts("summaryChildren", { count: children, price: priceToken(stayChildRate)})} />}{nightsSuffix}</span>
                    <span>{money(stayChildRate * children * nights)}</span>
                  </div>
                )}
                {infants > 0 && (
                  <div className="row">
                    <span>{stayInfantRate > 0 ? <PriceText text={ts("summaryInfants", { count: infants, price: priceToken(stayInfantRate)})} /> : ts("summaryInfantsFree", { count: infants })}{nightsSuffix}</span>
                    <span>{money(stayInfantRate * infants * nights)}</span>
                  </div>
                )}
              </>
            )}
            {selectedTransport && (
              <div className="row"><span>{selectedTransport.name}</span><span>{optionPrice(selectedTransport) == null ? ts("onRequest") : `${money(optionPrice(selectedTransport))}`}</span></div>
            )}
            {otherActivities.filter((a) => effectiveRideSlugs.includes(a.slug)).map((a) => (
              <div className="row" key={a.slug}><span>{a.title}{durationNote(a)}{activityQuantity(a, partySize, nights) > 1 ? ` × ${activityQuantity(a, partySize, nights)}` : ""}</span><span>{money(activityTotal(a, partySize, nights, minutesFor(a)))}</span></div>
            ))}
            <div className="row total"><span>{ts("grandTotal")}</span><span>{money(stayTotal + extrasTotal + serviceTotal)}</span></div>
          </div>

          <label className="ride-option tour-review-terms" data-invalid={!!errors.acceptedTerms}>
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            <span>{ta("termsPre")}<Link href="/legal/terms" target="_blank" rel="noopener noreferrer">{ta("termsLinkTerms")}</Link>{ta("termsMid")}<Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">{ta("termsLinkPrivacy")}</Link>{ta("termsPost")}</span>
          </label>
          {errors.acceptedTerms && <span className="err">{errors.acceptedTerms}</span>}
          {formError && <div className="alert">{formError}</div>}
        </div>
      )}

      <div className="book-actions">
        {step > 0 && (
          <button type="button" className="btn-quiet" onClick={back} disabled={submitting}>← {t("back")}</button>
        )}
        {step < lastStep ? (
          <button type="button" className="btn-accent" onClick={next}>
            {t("continue")}
          </button>
        ) : (
          <button type="button" className="btn-accent" onClick={submit} disabled={submitting}>
            {category === "circuit"
              ? (submitting ? t("reserving") : t("requestToBook"))
              : (submitting ? ts("reserving") : ts("reserveThisStay"))}
          </button>
        )}
      </div>
      <p className="note">{category === "accommodation" ? ts("freeCancellation") : t("noChargeNote")}</p>
    </div>
  );
}
