"use client";

import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { useCurrency } from "@/components/CurrencyProvider";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as api from "@/lib/api";
import { describeWriteFailure } from "@/lib/writeErrors";
import type { ServiceOptionCatalogItem, StayAvailability, TierAvailability } from "@/lib/api";
import { departureOptions, returnOptions } from "@/lib/cities";
import { optionTotal, returnCityOption } from "@/lib/tourOptions";
import { DEPARTURE_CITY_LABELS, type Accommodation, type Activity, type DepartureCity, type Stay } from "@/lib/types";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import ListSelect from "@/components/ListSelect";
import { guestsPerTier, isPlaced, tierPerNight, unplaced, type Guests } from "@/lib/guestPricing";
import { activityQuantity, activityTotal, baseMinutes, canExtend, durationsPayload } from "@/lib/activityPricing";
import ActivityDurationStepper, { useSessionLabel } from "@/components/booking/ActivityDurationStepper";
import DateRangePicker from "@/components/DateRangePicker";
import AccommodationPicker from "@/components/booking/AccommodationPicker";
import { useStepScroll } from "@/lib/useStepScroll";
import GuestPicker from "@/components/booking/GuestPicker";
import PhoneInput from "@/components/PhoneInput";
import { type Country } from "react-phone-number-input";
import { DEFAULT_COUNTRY_BY_LOCALE } from "@/lib/countryDialCodes";
import { composePhone } from "@/lib/phone";

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
  const { format: money, currency: displayCurrency } = useCurrency();
  const ta = useTranslations("authForm");
  const tb = useTranslations("bookingFlow");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const flowRef = useStepScroll(step);
  const PRICING_UNIT_LABEL: Record<ServiceOptionCatalogItem["pricingUnit"], string> = {
    PER_DAY: t("unitDay"),
    PER_BOOKING: t("unitBooking"),
    PER_PERSON: t("unitPerson"),
    PER_VEHICLE: t("unitVehicle"),
    PER_PERSON_NIGHT: t("unitPerson"), // tour options only; never listed in this flow
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
    infants?: number;
    accommodationSelections?: Record<string, number>;
    rideSlugs?: string[];
    hasOwnVehicle?: boolean | null;
    departureCity?: DepartureCity | "";
    returnCity?: DepartureCity | "";
    otherReturn?: boolean;
    returnCityOther?: string;
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
  const [infants, setInfants] = useState(initialDraft?.infants ?? 0);
  // Only used when several tiers are picked: who sleeps in each.
  const [tierAssignments] = useState<Record<string, Guests>>({});
  // slug -> quantity. A guest may pick several tiers at once (e.g. 2 Suites +
  // 3 Tentes in one booking). `initialAccommodationSlug` (from the "Réserver"
  // link on a tier's own detail page) is merged in rather than replacing
  // whatever the draft already held.
  const [accommodationSelections, setAccommodationSelections] = useState<Record<string, number>>(() => {
    // One tier per booking, like the /book flow: the whole party (set in step 1) sleeps in it.
    const saved = Object.entries(initialDraft?.accommodationSelections ?? {});
    if (initialAccommodationSlug) return { [initialAccommodationSlug]: 1 };
    return saved[0] ? { [saved[0][0]]: saved[0][1] } : {};
  });
  const [rideSlugs, setRideSlugs] = useState<string[]>(initialDraft?.rideSlugs ?? []);
  // Minutes picked per timed activity (absent = its base duration).
  const [durations, setDurations] = useState<Record<string, number>>({});
  const sessionLabel = useSessionLabel();
  const minutesFor = (a: Activity) => durations[a.slug] ?? baseMinutes(a);
  const durationNote = (a: Activity) => (minutesFor(a) !== baseMinutes(a) ? " · " + sessionLabel(minutesFor(a)) : "");

  // "Getting There & Guide" - hasOwnVehicle null = not chosen yet. Guide is
  // always offered; transport only when the guest has no vehicle. Kept as
  // two separate selections (never both a customer-vehicle guide AND a
  // transport option), matching the backend's own mutual-exclusion rule.
  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(initialDraft?.hasOwnVehicle ?? null);
  const [departureCity, setDepartureCity] = useState<DepartureCity | "">(initialDraft?.departureCity ?? "");
  // Optional return leg after the stay ends - same city list as
  // departureCity, entirely skippable.
  const [returnCity, setReturnCity] = useState<DepartureCity | "">(initialDraft?.returnCity ?? "");
  // A return city that is not in the list: typed by the guest, charged as a back-office option.
  const [otherReturn, setOtherReturn] = useState(initialDraft?.otherReturn ?? false);
  const [returnCityOther, setReturnCityOther] = useState(initialDraft?.returnCityOther ?? "");
  const [tourOptions, setTourOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [meetUpPlace, setMeetUpPlace] = useState("");
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
    api.getServiceOptions("TOUR_OPTION").then((items) => !cancelled && setTourOptions(items));
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
        infants,
        accommodationSelections,
        rideSlugs,
        hasOwnVehicle,
        departureCity,
        returnCity,
        otherReturn,
        returnCityOther,
        guideSlug,
        transportSlug,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Best-effort only — a private window or blocked storage just means
      // the draft won't survive the round trip, not a broken form.
    }
  }, [date, departureDate, adults, children, infants, accommodationSelections, rideSlugs, hasOwnVehicle, departureCity, returnCity, otherReturn, returnCityOther, guideSlug, transportSlug, draftKey]);

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
  const [phoneCountry, setPhoneCountry] = useState<Country>(() => (DEFAULT_COUNTRY_BY_LOCALE[locale] ?? "TN") as Country);
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
        if (ctrl.signal.aborted) return;
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
  const infantRate = stay.infantPrice ?? 0;
  // Tiers are priced per person: one tier takes the whole party, several take whoever the guest assigned.
  const party: Guests = { adults, children, infants };
  const tierGuests = guestsPerTier(selectedAccommodations.map(({ accommodation }) => accommodation.slug), party, tierAssignments);
  const nightly = selectedAccommodations.length > 0
    ? selectedAccommodations.reduce((sum, { accommodation }) => sum + tierPerNight(accommodation, tierGuests[accommodation.slug]), 0)
    : adults * adultRate + children * childRate + infants * infantRate;
  const total = nightly * nights;
  // Until a tier is chosen the stay is priced "from" its cheapest available tier.
  const availableTierPrices = (accommodations ?? []).filter((a) => !tierSoldOut(a.slug)).map((a) => a.priceFrom);
  const headerFromPrice = selectedAccommodations.length === 0 && availableTierPrices.length > 0
    ? Math.min(...availableTierPrices)
    : null;
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
    .reduce((sum, activity) => sum + activityTotal(activity, partySize, nights, minutesFor(activity)), 0);
  const otherReturnOption = returnCityOption(tourOptions);
  const returnOtherTotal = hasOwnVehicle === false && otherReturn && returnCityOther.trim() && otherReturnOption ? optionTotal(otherReturnOption, partySize, nights) : 0;

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
      if ((accommodations?.length ?? 0) > 0 && selectedAccommodations.length === 0) {
        e.accommodationSlug = tb("errorPickResult");
      }
      const soldOutSelection = selectedAccommodations.find(({ accommodation }) => tierSoldOut(accommodation.slug));
      if (soldOutSelection) e.accommodationSlug = t("errorSoldOut");
      else if (selectedAccommodations.length > 1 && !isPlaced(unplaced(party, selectedAccommodations.map(({ accommodation }) => tierGuests[accommodation.slug])))) {
        e.accommodationSlug = t("errorAssignGuests");
      } else if (selectedAccommodations.some(({ accommodation, qty }) => {
        const g = tierGuests[accommodation.slug];
        return accommodation.capacity != null && (g.adults + g.children < 1 || g.adults + g.children > accommodation.capacity * qty);
      })) {
        e.accommodationSlug = t("errorTierCapacity");
      }
    }
    if (step === 2) {
      if (hasOwnVehicle === false && otherReturn && !returnCityOther.trim()) e.returnCityOther = t("errorReturnCityOther");
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

  async function submit() {
    setErrors({});
    setFormError("");

    const soldOutSelection = selectedAccommodations.find(({ accommodation }) => tierSoldOut(accommodation.slug));
    if (soldOutSelection) {
      setErrors({ accommodationSlug: t("errorSoldOut") });
      return;
    }

    const newErrors: Record<string, string> = {};
    if (hasOwnVehicle === false && otherReturn && !returnCityOther.trim()) {
      newErrors.returnCityOther = t("errorReturnCityOther");
    }
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
      // One tier takes the whole party (the server knows); several say who sleeps in each.
      ...(selectedAccommodations.length > 1 ? tierGuests[accommodation.slug] : {}),
    }));

    const result = await api.createStayBooking({
      staySlug: stay.slug,
      accommodations: accommodationsPayload.length > 0 ? accommodationsPayload : undefined,
      date,
      nights: multiNight ? nights : undefined,
      partySize,
      children: children > 0 ? children : undefined,
      infants: infants > 0 ? infants : undefined,
      rideSlugs,
      activityDurations: durationsPayload(activities, rideSlugs, durations),
      arrivalMode: hasOwnVehicle ? "OWN_VEHICLE" : "TRANSPORT",
      departureCity: hasOwnVehicle === false ? departureCity || undefined : undefined,
      // Either a city from the list or one the guest typed, never both.
      returnCity: hasOwnVehicle === false && !otherReturn && returnCity ? returnCity : undefined,
      returnCityOther: hasOwnVehicle === false && otherReturn && returnCityOther.trim() ? returnCityOther.trim() : undefined,
      displayCurrency,
      meetUpPlace: hasOwnVehicle === false && meetUpPlace.trim() ? meetUpPlace.trim() : undefined,
      serviceOptions: serviceOptions.length > 0 ? serviceOptions : undefined,
      name,
      email,
      phone: composePhone(phoneCountry, phone),
      notes: notes.trim() || undefined,
      idempotencyKey: idempotencyKeyRef.current,
      acceptedTerms,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(describeWriteFailure(result, t("errorGeneric")));
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
    <div className="tour-book-flow" ref={flowRef}>
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
          {(step === 0 || step === 1) && (headerFromPrice != null ? <PriceText text={t("fromPrice", { price: priceToken(headerFromPrice)})} /> : `${money(total)}`)}
          {step === 2 && (hasOwnVehicle === false ? t("onRequest") : t("ownVehicle"))}
          {step === 3 && `${money(extrasTotal)}`}
          {step === 4 && `${money(total + extrasTotal + serviceTotal + returnOtherTotal)}`}
        </strong>
      </div>

      {step === 1 && accommodations && accommodations.length > 0 && (
        <div className="acc-step" data-invalid={!!errors.accommodationSlug}>
          <label>{t("chooseCamp")}</label>
<AccommodationPicker
            name="stayAccommodation"
            mode="single"
            items={accommodations}
            selections={accommodationSelections}
            onChange={setAccommodationSelections}
            availability={tierAvailability}
            detailsHref={(slug) => `/camp/${stay.slug}/${slug}`}
          />
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

          <GuestPicker
            adults={adults}
            kids={children}
            infants={infants}
            error={errors.partySize}
            onChange={(a, c, n) => {
              setAdults(a);
              setChildren(c);
              setInfants(n);
            }}
          />
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
        {hasOwnVehicle === false && (
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="sf-meet-up-place">{t("meetUpPlaceLabel")}</label>
            <p className="hint">{t("meetUpPlaceHint")}</p>
            <input
              id="sf-meet-up-place"
              maxLength={255}
              placeholder={t("meetUpPlacePlaceholder")}
              value={meetUpPlace}
              onChange={(e) => setMeetUpPlace(e.target.value)}
            />
          </div>
        )}

        {hasOwnVehicle === false && (
          <>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="sf-departure-city">{t("departureCityLabel")}</label>
            <ListSelect
              id="sf-departure-city"
              value={departureCity}
              onChange={setDepartureCity}
              options={departureOptions(stay.departureCities)}
              labels={DEPARTURE_CITY_LABELS}
              placeholder={t("departureCityPlaceholder")}
            />
          </div>

          <div className="field" style={{ marginTop: 12 }} data-invalid={!!errors.returnCityOther}>
            <label htmlFor="sf-return-city">{t("returnCityLabel")}</label>
            <p className="hint">{t("returnCityHint")}</p>
            {returnOptions(stay.returnCities).length > 0 && !otherReturn && (
              <ListSelect
                id="sf-return-city"
                value={returnCity}
                onChange={setReturnCity}
                options={returnOptions(stay.returnCities)}
                labels={DEPARTURE_CITY_LABELS}
                placeholder={t("returnCityPlaceholder")}
              />
            )}
            {returnOptions(stay.returnCities).length > 0 && (
              <label className="ride-option" style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={otherReturn}
                  onChange={(e) => {
                    setOtherReturn(e.target.checked);
                    if (e.target.checked) setReturnCity("");
                  }}
                />
                <span>{t("returnOtherToggle")}</span>
                <span className="ride-price">
                  {otherReturnOption && (otherReturnOption.priceTtc ?? 0) > 0
                    ? <PriceText text={t("returnOtherPrice", { price: priceToken(optionTotal(otherReturnOption, partySize, nights))})} />
                    : t("returnOtherOnRequest")}
                </span>
              </label>
            )}
            {(otherReturn || returnOptions(stay.returnCities).length === 0) && (
              <input
                id="sf-return-city-other"
                maxLength={120}
                style={{ marginTop: 10 }}
                placeholder={t("returnOtherPlaceholder")}
                value={returnCityOther}
                onChange={(e) => {
                  setOtherReturn(true);
                  setReturnCityOther(e.target.value);
                }}
              />
            )}
            {errors.returnCityOther && <span className="err">{errors.returnCityOther}</span>}
          </div>
          </>
        )}

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
                          : <PriceText text={t("pricePerUnit", { price: priceToken(o.priceTtc), unit: PRICING_UNIT_LABEL[o.pricingUnit] })} />}
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
                          : <PriceText text={t("plusPricePerUnit", { price: priceToken(o.priceTtc), unit: PRICING_UNIT_LABEL[o.pricingUnit] })} />}
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
              <Fragment key={a.slug}>
<label className="ride-option">
                <input
                  type="checkbox"
                  checked={rideSlugs.includes(a.slug)}
                  onChange={() => toggleRide(a.slug)}
                />
                <span>{a.title}</span>
                <span className="ride-price">{<PriceText text={t("fromPrice", { price: priceToken(a.priceFrom)})} />}</span>
              </label>
{rideSlugs.includes(a.slug) && canExtend(a) && (
<ActivityDurationStepper activity={a} minutes={minutesFor(a)} onChange={(m) => setDurations((cur) => ({ ...cur, [a.slug]: m }))} />
)}
</Fragment>
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
<PhoneInput
                id="s-phone"
                country={phoneCountry}
                onCountryChange={setPhoneCountry}
                value={phone}
                onChange={setPhone}
                invalid={!!errors.phone}
                searchPlaceholder={tb("phoneSearchPlaceholder")}
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
              <span>{adults} {t("adults").toLowerCase()}{children > 0 ? ` · ${children} ${t("children").toLowerCase()}` : ""}{infants > 0 ? ` · ${infants} ${t("infants").toLowerCase()}` : ""}</span>
            </div>
            <div className="row"><span className="k">{t("reviewVehicleLabel")}</span><span>{hasOwnVehicle ? t("ownVehicle") : t("needTransport")}</span></div>
            {hasOwnVehicle === false && departureCity && <div className="row"><span className="k">{t("departureCityLabel")}</span><span>{DEPARTURE_CITY_LABELS[departureCity]}</span></div>}
            {hasOwnVehicle === false && !otherReturn && returnCity && <div className="row"><span className="k">{t("returnCityLabel")}</span><span>{DEPARTURE_CITY_LABELS[returnCity]}</span></div>}
            {hasOwnVehicle === false && otherReturn && returnCityOther.trim() && <div className="row"><span className="k">{t("returnCityLabel")}</span><span>{returnCityOther.trim()}</span></div>}
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
                    .map((a) => `${a.title}${durationNote(a)} — ${money(activityTotal(a, partySize, nights, minutesFor(a)))}`)
                    .join(", ")}
                </span>
              </div>
            )}
            {(email || phone) && <div className="row"><span className="k">{t("contactLabel")}</span><span>{email} · {composePhone(phoneCountry, phone)}</span></div>}
            {notes && <div className="row"><span className="k">{t("notesLabelSummary")}</span><span>{notes}</span></div>}

            {selectedAccommodations.length > 0 ? (
              selectedAccommodations.map(({ accommodation, qty }) => (
                <div className="row" key={accommodation.slug}>
                  <span>{qty} × {accommodation.title}{nightsSuffix}</span>
                  <span>{money(tierPerNight(accommodation, tierGuests[accommodation.slug]) * nights)}</span>
                </div>
              ))
            ) : (
              <>
                <div className="row">
                  <span>{<PriceText text={t("summaryAdults", { count: adults, price: priceToken(adultRate)})} />}{nightsSuffix}</span>
                  <span>{money(adults * adultRate * nights)}</span>
                </div>
                {children > 0 && (
                  <div className="row">
                    <span>{<PriceText text={t("summaryChildren", { count: children, price: priceToken(childRate)})} />}{nightsSuffix}</span>
                    <span>{money(children * childRate * nights)}</span>
                  </div>
                )}
                {infants > 0 && (
                  <div className="row">
                    <span>{infantRate > 0 ? <PriceText text={t("summaryInfants", { count: infants, price: priceToken(infantRate)})} /> : t("summaryInfantsFree", { count: infants })}{nightsSuffix}</span>
                    <span>{money(infants * infantRate * nights)}</span>
                  </div>
                )}
              </>
            )}
            {selectedGuide && (
              <div className="row">
                <span>{selectedGuide.name}</span>
                <span>{optionPrice(selectedGuide) == null ? t("onRequest") : `${money(optionPrice(selectedGuide))}`}</span>
              </div>
            )}
            {selectedTransport && (
              <div className="row">
                <span>{selectedTransport.name}</span>
                <span>{optionPrice(selectedTransport) == null ? t("onRequest") : `${money(optionPrice(selectedTransport))}`}</span>
              </div>
            )}
            {returnOtherTotal > 0 && (
              <div className="row">
                <span>{otherReturnOption?.name}</span>
                <span>{money(returnOtherTotal)}</span>
              </div>
            )}
            {activities.filter((activity) => rideSlugs.includes(activity.slug)).map((activity) => (
              <div className="row" key={activity.slug}>
                <span>
                  {activity.title}
                  {activityQuantity(activity, partySize, nights) > 1 ? ` × ${activityQuantity(activity, partySize, nights)}` : ""}
                </span>
                <span>{money(activityTotal(activity, partySize, nights, minutesFor(activity)))}</span>
              </div>
            ))}
            <div className="row total">
              <span>{t("grandTotal")}</span>
              <span>{money(total + extrasTotal + serviceTotal + returnOtherTotal)}</span>
            </div>
          </div>

          <label className="ride-option tour-review-terms" data-invalid={!!errors.acceptedTerms}>
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            <span>
              {ta("termsPre")}<Link href="/legal/terms" target="_blank" rel="noopener noreferrer">{ta("termsLinkTerms")}</Link>
              {ta("termsMid")}<Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">{ta("termsLinkPrivacy")}</Link>{ta("termsPost")}
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
