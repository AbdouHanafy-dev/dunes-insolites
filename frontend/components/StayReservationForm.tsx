"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import * as api from "@/lib/api";
import type { ServiceOptionCatalogItem, StayAvailability, TierAvailability } from "@/lib/api";
import { MAX_PARTY_SIZE, type Accommodation, type Activity, type Stay } from "@/lib/types";
import { useToast } from "@/components/Toast";

type ServiceAvailabilityState = {
  forDate: string;
  bySlug: Record<string, api.ServiceOptionAvailability | null>;
};

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
  const t = useTranslations("stayReservationForm");
  const PRICING_UNIT_LABEL: Record<ServiceOptionCatalogItem["pricingUnit"], string> = {
    PER_DAY: t("unitDay"),
    PER_BOOKING: t("unitBooking"),
    PER_PERSON: t("unitPerson"),
    PER_VEHICLE: t("unitVehicle"),
  };
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [accommodationSlug, setAccommodationSlug] = useState(initialAccommodationSlug ?? "");
  const [accommodationQty, setAccommodationQty] = useState(1);
  const [rideSlugs, setRideSlugs] = useState<string[]>([]);

  // "Getting There & Guide" - hasOwnVehicle null = not chosen yet. Guide is
  // always offered; transport only when the guest has no vehicle. Kept as
  // two separate selections (never both a customer-vehicle guide AND a
  // transport option), matching the backend's own mutual-exclusion rule.
  const [hasOwnVehicle, setHasOwnVehicle] = useState<boolean | null>(null);
  const [guideOptions, setGuideOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [transportOptions, setTransportOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [guideSlug, setGuideSlug] = useState("");
  const [transportSlug, setTransportSlug] = useState("");
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
    const ctrl = new AbortController();
    const forDate = date;
    api
      .getStayAvailability(stay.slug, forDate, ctrl.signal)
      .then((data) => {
        setAvail({ forDate, data, error: false });
        if (data?.accommodations.some((t) => t.status === "UNAVAILABLE")) {
          setAccommodationSlug((cur) =>
            data.accommodations.find((t) => t.slug === cur)?.status === "UNAVAILABLE" ? "" : cur,
          );
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setAvail({ forDate, data: null, error: true });
      });
    return () => ctrl.abort();
  }, [date, stay.slug]);

  function tierAvailability(slug: string): TierAvailability | undefined {
    return availabilityFor?.accommodations.find((t) => t.slug === slug);
  }
  function tierSoldOut(slug: string): boolean {
    return tierAvailability(slug)?.status === "UNAVAILABLE";
  }
  function refreshAvailability() {
    if (!date) return;
    const forDate = date;
    api.getStayAvailability(stay.slug, forDate).then((data) =>
      setAvail({ forDate, data, error: false }),
    ).catch(() => {});
  }

  const min = todayISO();
  const partySize = adults + children;
  const selectedAccommodation = accommodations?.find((a) => a.slug === accommodationSlug);
  // Per unit while a specific tent/room/suite is chosen — how many units count
  // against a shared night's price is still to be confirmed with the camp, so
  // this stays a free pick rather than something derived from party size.
  // Display-only estimate. The authoritative total is computed server-side from
  // the snapshotted per-unit price — this number is never submitted (see the
  // createStayBooking payload below: slugs, qty, party, contact only).
  const total = selectedAccommodation
    ? selectedAccommodation.priceFrom * accommodationQty
    : stay.priceFrom * partySize;

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
    setErrors({});
    setFormError("");

    if (accommodationSlug && tierSoldOut(accommodationSlug)) {
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
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

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

    const result = await api.createStayBooking({
      staySlug: stay.slug,
      accommodationSlug: accommodationSlug || undefined,
      accommodationQty: accommodationSlug ? accommodationQty : undefined,
      date,
      partySize,
      rideSlugs,
      arrivalMode: hasOwnVehicle ? "OWN_VEHICLE" : "TRANSPORT",
      serviceOptions: serviceOptions.length > 0 ? serviceOptions : undefined,
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
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
  }

  if (booking) {
    const rideNames = activities
      .filter((a) => rideSlugs.includes(a.slug))
      .map((a) => a.title);
    return (
      <div className="alert ok" style={{ marginTop: 0 }}>
        <strong>{t("reservedConfirmation", { id: booking.id })}</strong> {t("reservedBody")}
        {rideNames.length > 0 && t("reservedWithRides", { rides: rideNames.join(", ") })}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="reserve-form">
      {accommodations && accommodations.length > 0 && (
        <div className="field" data-invalid={!!errors.accommodationSlug}>
          <label>{t("chooseCamp")}</label>
          <div className="ride-options">
            {accommodations.map((a) => {
              const av = tierAvailability(a.slug);
              const soldOut = av?.status === "UNAVAILABLE";
              return (
                <label
                  key={a.slug}
                  className="ride-option"
                  data-disabled={soldOut || undefined}
                >
                  <input
                    type="radio"
                    name="accommodation"
                    checked={accommodationSlug === a.slug}
                    disabled={soldOut}
                    onChange={() => selectAccommodation(a.slug)}
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
              );
            })}
          </div>
          {errors.accommodationSlug && <span className="err">{errors.accommodationSlug}</span>}
          {selectedAccommodation && (
            <div className="guest-picker" style={{ marginTop: 10 }}>
              <div className="guest-row">
                <div>
                  <strong>{t("howMany")}</strong>
                  <span>{t("exactRuleNote")}</span>
                </div>
                <div className="guest-stepper">
                  <button
                    type="button"
                    onClick={() => changeAccommodationQty(-1)}
                    disabled={accommodationQty === 1}
                    aria-label={t("decrease")}
                  >
                    −
                  </button>
                  <output aria-label={`${accommodationQty} ${selectedAccommodation.title}`}>
                    {accommodationQty}
                  </output>
                  <button
                    type="button"
                    onClick={() => changeAccommodationQty(1)}
                    disabled={accommodationQty === 6}
                    aria-label={t("increase")}
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
        <label htmlFor="s-date">{t("arrivalDateLabel")}</label>
        <input
          id="s-date"
          type="date"
          min={min}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {availabilityLoading && <p className="hint">{t("checkingAvailability")}</p>}
        {availabilityFor &&
          availabilityFor.accommodations.length > 0 &&
          availabilityFor.accommodations.every((a) => a.status === "UNAVAILABLE") && (
            <p className="hint">{t("everyCampBooked")}</p>
          )}
        {errors.date && <span className="err">{errors.date}</span>}
      </div>

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

      <div className="field" data-invalid={!!errors.rideSlugs}>
        <label>{t("addRide")}</label>
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
        <p className="hint">{t("confirmOnSite")}</p>
        {errors.rideSlugs && <span className="err">{errors.rideSlugs}</span>}
      </div>

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

      <div className="summary">
        <div className="row">
          <span>{selectedAccommodation?.title ?? t("stayFallbackLabel")}</span>
          <span>€{total}</span>
        </div>
        {selectedGuide && (
          <div className="row">
            <span>{selectedGuide.name}</span>
            <span>{optionPrice(selectedGuide) == null ? t("onRequest") : `${optionPrice(selectedGuide)} TND`}</span>
          </div>
        )}
        {selectedTransport && (
          <div className="row">
            <span>{selectedTransport.name}</span>
            <span>{optionPrice(selectedTransport) == null ? t("onRequest") : `${optionPrice(selectedTransport)} TND`}</span>
          </div>
        )}
        {activities.filter((activity) => rideSlugs.includes(activity.slug)).map((activity) => (
          <div className="row" key={activity.slug}>
            <span>{activity.title}</span>
            <span>{t("fromPrice", { price: activity.priceFrom })}</span>
          </div>
        ))}
        <div className="row total">
          <span>{t("stayTotal")}</span>
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

      <button type="submit" className="btn-accent" disabled={submitting}>
        {submitting ? t("reserving") : t("reserveThisStay")}
      </button>
      <p className="note">{t("freeCancellation")}</p>
    </form>
  );
}
