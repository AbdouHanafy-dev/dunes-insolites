"use client";

import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { useCurrency } from "@/components/CurrencyProvider";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as api from "@/lib/api";
import type { Language, ServiceOptionCatalogItem } from "@/lib/api";
import { departureOptions, returnOptions } from "@/lib/cities";
import { describeWriteFailure } from "@/lib/writeErrors";
import { DEPARTURE_CITY_LABELS, type Activity, type DepartureCity } from "@/lib/types";
import { useToast } from "@/components/Toast";
import DatePicker from "@/components/DatePicker";
import ListSelect from "@/components/ListSelect";
import { useStepScroll } from "@/lib/useStepScroll";
import GuestPicker from "@/components/booking/GuestPicker";
import LanguageChips from "@/components/booking/LanguageChips";
import PhoneInput from "@/components/PhoneInput";
import { type Country } from "react-phone-number-input";
import { DEFAULT_COUNTRY_BY_LOCALE } from "@/lib/countryDialCodes";
import { composePhone } from "@/lib/phone";
import { isUpgradeAvailable, optionTotal, returnCityOption, upgradeOptions } from "@/lib/tourOptions";
import { activityQuantity, activityTotal, baseMinutes, canExtend, durationsPayload } from "@/lib/activityPricing";
import ActivityDurationStepper, { useSessionLabel } from "@/components/booking/ActivityDurationStepper";
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
 * travelers → Guide language → Departure & return cities → (paid upgrades, when the back
 * office offers any for this party) → Extras → Review & book. Guests never choose a staff
 * member: they state their preferred language and the admin assigns an available guide from
 * the reservation staff panel. The night at the camp is included in the circuit's price, so
 * there is no accommodation to choose; a single tent or a suite is a paid upgrade, and a
 * return city outside the list is a paid option too - both priced in the back office.
 */
export default function TourBookingFlow({
  tourSlug,
  tourTitle,
  adultPrice,
  childPrice,
  infantPrice = 0,
  nights = 0,
  departureCities,
  returnCities,
  embedded,
}: {
  tourSlug: string;
  tourTitle: string;
  adultPrice: number;
  childPrice: number;
  /** 0-3 years, set in the back office. 0 = free. */
  infantPrice?: number;
  /** Nights the circuit crosses (its days minus one). 0 = a single day: no upgrade to offer. */
  nights?: number;
  /** Cities ticked for this circuit in the back office. */
  departureCities?: readonly DepartureCity[];
  returnCities?: readonly DepartureCity[];
  /**
   * Set when this form is the second half of the general /book flow, which has already asked for the
   * type and the circuit: those two steps head the progress bar as done, and "Back" on the first step
   * here returns to the choice of circuit.
   */
  embedded?: { leadingSteps: string[]; onBackToChoice: () => void };
}) {
  const leadingSteps = embedded?.leadingSteps ?? [];
  const t = useTranslations("tourBookingForm");
  const { format: money, currency: displayCurrency } = useCurrency();
  const ta = useTranslations("authForm");
  const tb = useTranslations("bookingFlow");
  const toast = useToast();
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const flowRef = useStepScroll(step);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [departureCity, setDepartureCity] = useState<DepartureCity | "">("");
  // Optional return leg after the tour ends - same city list as
  // departureCity, entirely skippable.
  const [returnCity, setReturnCity] = useState<DepartureCity | "">("");
  // A return city that is not in the list: typed by the guest, charged as an option.
  const [otherReturn, setOtherReturn] = useState(false);
  const [returnCityOther, setReturnCityOther] = useState("");
  // A partner's promo code: the site shows the discount, the server works it out again at booking.
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoState, setPromoState] = useState<"idle" | "checking" | "invalid">("idle");
  // The back office's paid options for a circuit (upgrades, another return city).
  const [tourOptions, setTourOptions] = useState<ServiceOptionCatalogItem[]>([]);
  const [upgradeSlugs, setUpgradeSlugs] = useState<string[]>([]);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [rideSlugs, setRideSlugs] = useState<string[]>([]);
  // Minutes picked per timed activity (absent = its base duration).
  const [durations, setDurations] = useState<Record<string, number>>({});
  const sessionLabel = useSessionLabel();
  const minutesFor = (a: Activity) => durations[a.slug] ?? baseMinutes(a);
  const durationNote = (a: Activity) => (minutesFor(a) !== baseMinutes(a) ? " · " + sessionLabel(minutesFor(a)) : "");

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
    Promise.allSettled([api.getActivities(locale), api.getServiceOptions("TOUR_OPTION")]).then(([extras, options]) => {
      if (cancelled) return;
      if (extras.status === "fulfilled") setActivities(extras.value);
      if (options.status === "fulfilled") setTourOptions(options.value);
      setCatalogLoaded(true);
    });
    api.getLanguages().then((items) => !cancelled && setLanguages(items));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const party = adults + children;
  const upgrades = useMemo(() => upgradeOptions(tourOptions, nights), [tourOptions, nights]);
  const otherReturnOption = returnCityOption(tourOptions);

  // A tent/suite upgrade is a priced Extra (TOUR_OPTION), same mechanism as
  // the "Getting There & Guide" service options - checked the same way, for
  // the tour's chosen date, since the upgrade occupies the same camp-night
  // inventory as a direct nuitée booking. Advisory - the booking call
  // re-checks under a lock.
  const [upgradeAvailability, setUpgradeAvailability] = useState<{
    forDate: string;
    bySlug: Record<string, api.ServiceOptionAvailability | null>;
  }>();
  useEffect(() => {
    if (!date || upgrades.length === 0) return;
    const ctrl = new AbortController();
    Promise.all(
      upgrades.map(async (o) => [o.slug, await api.getServiceOptionAvailability(o.slug, date, ctrl.signal)] as const),
    ).then((entries) => {
      if (!ctrl.signal.aborted) {
        const bySlug = Object.fromEntries(entries);
        setUpgradeAvailability({ forDate: date, bySlug });
        setUpgradeSlugs((current) => current.filter((slug) => bySlug[slug]?.status !== "UNAVAILABLE"));
      }
    }).catch(() => {});
    return () => ctrl.abort();
  }, [date, upgrades]);

  function upgradeUnavailable(option: ServiceOptionCatalogItem): boolean {
    if (upgradeAvailability?.forDate !== date) return false;
    return upgradeAvailability.bySlug[option.slug]?.status === "UNAVAILABLE";
  }

  const [activityAvailability, setActivityAvailability] = useState<{
    forDate: string;
    bySlug: Record<string, api.ActivityAvailability | null>;
  }>();
  useEffect(() => {
    if (!date || activities.length === 0) return;
    const ctrl = new AbortController();
    Promise.all(
      activities.map(async (activity) => [
        activity.slug,
        await api.getActivityAvailability(activity.slug, date, ctrl.signal),
      ] as const),
    ).then((entries) => {
      if (!ctrl.signal.aborted) {
        const bySlug = Object.fromEntries(entries);
        setActivityAvailability({ forDate: date, bySlug });
        setRideSlugs((current) => current.filter((slug) => bySlug[slug]?.status !== "UNAVAILABLE"));
      }
    }).catch(() => {});
    return () => ctrl.abort();
  }, [date, activities]);

  function activityUnavailable(activity: Activity): boolean {
    return activityAvailability?.forDate === date
      && activityAvailability.bySlug[activity.slug]?.status === "UNAVAILABLE";
  }

  const visibleSteps = [
    { id: 0, label: t("stepDateTravelers") },
    { id: 1, label: t("stepGuide") },
    { id: 2, label: t("stepCities") },
    ...(upgrades.length > 0 ? [{ id: 6, label: t("stepUpgrade") }] : []),
    { id: 3, label: t("stepExtras") },
    { id: 4, label: t("stepReview") },
  ];
  const activeStepPosition = visibleSteps.findIndex((item) => item.id === step);
  const activeStep = visibleSteps[activeStepPosition] ?? visibleSteps[0];

  const extrasTotal = activities
    .filter((activity) => rideSlugs.includes(activity.slug) && !activityUnavailable(activity))
    .reduce((sum, activity) => sum + activityTotal(activity, adults + children, 1, minutesFor(activity)), 0);
  // An upgrade the party no longer qualifies for (it shrank below the minimum) is dropped, not kept in the total.
  const chosenUpgrades = upgrades.filter((option) =>
    upgradeSlugs.includes(option.slug) && isUpgradeAvailable(option, party) && !upgradeUnavailable(option));
  const upgradesTotal = chosenUpgrades.reduce((sum, option) => sum + optionTotal(option, party, nights), 0);
  const returnOtherTotal = otherReturn && returnCityOther.trim() && otherReturnOption ? optionTotal(otherReturnOption, party, nights) : 0;
  const optionsTotal = upgradesTotal + returnOtherTotal;

  function toggleRide(slug: string) {
    setRideSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function toggleUpgrade(slug: string) {
    setUpgradeSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function toggleLanguage(id: string) {
    setPreferredLanguageIds((cur) => (cur.includes(id) ? cur.filter((l) => l !== id) : [...cur, id]));
  }

  const min = todayISO();
  const total = adultPrice * adults + childPrice * children + infantPrice * infants;
  // The code takes a percentage off the circuit price only, never off options or activities.
  const promoDiscount = promo ? Math.round(total * promo.percent * 10) / 1000 : 0;

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoState("checking");
    const result = await api.checkPromoCode(code);
    if (result.valid && result.discountPercent) {
      setPromo({ code: code.toUpperCase(), percent: result.discountPercent });
      setPromoState("idle");
    } else {
      setPromo(null);
      setPromoState("invalid");
    }
  }

  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoState("idle");
  }

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
    if (step === 2 && otherReturn && !returnCityOther.trim()) {
      e.returnCityOther = t("errorReturnCityOther");
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
    if (position <= 0 && embedded) {
      embedded.onBackToChoice();
      return;
    }
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
      numberOfInfants: infants > 0 ? infants : undefined,
      rideSlugs,
      activityDurations: durationsPayload(activities, rideSlugs, durations),
      departureCity: departureCity || undefined,
      // Either a city from the list or one the guest typed, never both.
      returnCity: !otherReturn && returnCity ? returnCity : undefined,
      returnCityOther: otherReturn && returnCityOther.trim() ? returnCityOther.trim() : undefined,
      promoCode: promo?.code,
      displayCurrency,
      // Upgrades are sent by slug only: the server prices them and re-checks the minimum party.
      serviceOptions: chosenUpgrades.length > 0 ? chosenUpgrades.map((option) => ({ serviceOptionSlug: option.slug })) : undefined,
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
      setFormError(describeWriteFailure(result, t("errorGeneric")));
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
      <div
        className="stepper"
        aria-label={activeStep.label}
        style={leadingSteps.length > 0 ? { gridTemplateColumns: `repeat(${leadingSteps.length + visibleSteps.length}, minmax(0, 1fr))` } : undefined}
      >
        {leadingSteps.map((label, i) => (
          <span key={`lead-${i}`} className="s" data-state="done">
            <span className="step-dot" aria-hidden="true">✓</span>
            <span className="step-label">{label}</span>
          </span>
        ))}
        {visibleSteps.map((item, i) => {
          return (
            <span
              key={item.id}
              className="s"
              data-state={i === activeStepPosition ? "active" : i < activeStepPosition ? "done" : "todo"}
              aria-current={i === activeStepPosition ? "step" : undefined}
            >
              <span className="step-dot" aria-hidden="true">{i < activeStepPosition ? "✓" : leadingSteps.length + i + 1}</span>
              <span className="step-label">{item.label}</span>
            </span>
          );
        })}
      </div>

      <div className="tour-book-step-heading">
        <span>0{leadingSteps.length + activeStepPosition + 1}</span>
        <h3>{activeStep.label}</h3>
        <strong className="tour-book-step-amount">
          {step === 0 && `${money(total)}`}
          {step === 1 && money(0)}
          {step === 2 && (returnOtherTotal > 0 ? `${money(returnOtherTotal)}` : "")}
          {step === 6 && `${money(upgradesTotal)}`}
          {step === 3 && `${money(extrasTotal)}`}
          {step === 4 && `${money(total + optionsTotal + extrasTotal)}`}
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

      {/* ---------- 3. departure and return cities ---------- */}
      {step === 2 && (
        <div className="reserve-form" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
          <div className="field">
            <label htmlFor="tf-departure-city">{t("departureCityLabel")}</label>
            <ListSelect
              id="tf-departure-city"
              value={departureCity}
              onChange={setDepartureCity}
              options={departureOptions(departureCities)}
              labels={DEPARTURE_CITY_LABELS}
              placeholder={t("departureCityPlaceholder")}
            />
          </div>

          <div className="field" data-invalid={!!errors.returnCityOther}>
            <label htmlFor="tf-return-city">{t("returnCityLabel")}</label>
            <p className="hint">{t("returnCityHint")}</p>
            {returnOptions(returnCities).length > 0 && !otherReturn && (
              <ListSelect
                id="tf-return-city"
                value={returnCity}
                onChange={setReturnCity}
                options={returnOptions(returnCities)}
                labels={DEPARTURE_CITY_LABELS}
                placeholder={t("returnCityPlaceholder")}
              />
            )}
            {returnOptions(returnCities).length > 0 && (
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
                    ? <PriceText text={t("returnOtherPrice", { price: priceToken(optionTotal(otherReturnOption, party, nights))})} />
                    : t("returnOtherOnRequest")}
                </span>
              </label>
            )}
            {(otherReturn || returnOptions(returnCities).length === 0) && (
              <input
                id="tf-return-city-other"
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
        </div>
      )}

      {/* ---------- 3b. paid upgrades (only when the back office offers one for this party) ---------- */}
      {step === 6 && (
        <div className="field">
          <label>{t("upgradeLabel")}</label>
          <p className="hint">{t("upgradeHint")}</p>
          <div className="ride-options">
            {upgrades.map((option) => {
              const meetsParty = isUpgradeAvailable(option, party);
              const soldOut = upgradeUnavailable(option);
              const available = meetsParty && !soldOut;
              return (
                <label className="ride-option" key={option.slug} data-disabled={available ? undefined : "true"}>
                  <input
                    type="checkbox"
                    checked={available && upgradeSlugs.includes(option.slug)}
                    disabled={!available}
                    onChange={() => toggleUpgrade(option.slug)}
                  />
                  <span>
                    {option.name}
                    {option.description && <small className="upgrade-desc">{option.description}</small>}
                    {!meetsParty && <small className="upgrade-reason">{t("upgradeMinParty", { count: option.minPartySize ?? 0 })}</small>}
                  </span>
                  <span className="ride-price">
                    {soldOut
                      ? t("unavailable")
                      : <PriceText text={t("upgradePrice", { price: priceToken(optionTotal(option, party, nights)) })} />}
                  </span>
                </label>
              );
            })}
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
              {activities.map((a) => {
                const unavailable = activityUnavailable(a);
                return (
                <Fragment key={a.slug}>
<label className="ride-option" data-disabled={unavailable || undefined}>
                  <input
                    type="checkbox"
                    checked={!unavailable && rideSlugs.includes(a.slug)}
                    disabled={unavailable}
                    onChange={() => toggleRide(a.slug)}
                  />
                  <span>{a.title}</span>
                  <span className="ride-price">{unavailable ? t("unavailable") : <PriceText text={t("fromPrice", { price: priceToken(a.priceFrom)})} />}</span>
                </label>
{!unavailable && rideSlugs.includes(a.slug) && canExtend(a) && (
<ActivityDurationStepper activity={a} minutes={minutesFor(a)} onChange={(m) => setDurations((cur) => ({ ...cur, [a.slug]: m }))} />
)}
</Fragment>
                );
              })}
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
            <div className="row">
              <span className="k">{t("travelersLabel")}</span>
              <span>
                {adults} {t("adultsLabel").toLowerCase()}
                {children > 0 ? ` · ${children} ${t("childrenLabel").toLowerCase()}` : ""}
                {infants > 0 ? ` · ${infants} ${t("infantsLabel").toLowerCase()}` : ""}
              </span>
            </div>
            {departureCity && (
              <div className="row">
                <span className="k">{t("departureCityLabel")}</span>
                <span>{DEPARTURE_CITY_LABELS[departureCity]}</span>
              </div>
            )}
            {!otherReturn && returnCity && (
              <div className="row">
                <span className="k">{t("returnCityLabel")}</span>
                <span>{DEPARTURE_CITY_LABELS[returnCity]}</span>
              </div>
            )}
            {otherReturn && returnCityOther.trim() && (
              <div className="row">
                <span className="k">{t("returnCityLabel")}</span>
                <span>{returnCityOther.trim()}</span>
              </div>
            )}
            {chosenUpgrades.length > 0 && (
              <div className="row">
                <span className="k">{t("reviewUpgradesLabel")}</span>
                <span>{chosenUpgrades.map((option) => option.name).join(", ")}</span>
              </div>
            )}
            {rideSlugs.length > 0 && (
              <div className="row">
                <span className="k">{t("reviewExtrasLabel")}</span>
                <span>
                  {activities
                    .filter((a) => rideSlugs.includes(a.slug))
                    .map((a) => `${a.title}${durationNote(a)} — ${money(activityTotal(a, adults + children, 1, minutesFor(a)))}`)
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
              <span>{money(adultPrice * adults)}</span>
            </div>
            {children > 0 && (
              <div className="row">
                <span className="k">{children} × {t("childrenLabel")}</span>
                <span>{money(childPrice * children)}</span>
              </div>
            )}
            {infants > 0 && (
              <div className="row">
                <span className="k">{infants} × {t("infantsLabel")}</span>
                <span>{money(infantPrice * infants)}</span>
              </div>
            )}
            {chosenUpgrades.map((option) => (
              <div className="row" key={option.slug}>
                <span className="k">{option.name}</span>
                <span>{money(optionTotal(option, party, nights))}</span>
              </div>
            ))}
            {returnOtherTotal > 0 && (
              <div className="row">
                <span className="k">{otherReturnOption?.name}</span>
                <span>{money(returnOtherTotal)}</span>
              </div>
            )}
            {activities.filter((a) => rideSlugs.includes(a.slug)).map((a) => (
              <div className="row" key={a.slug}>
                <span className="k">
                  {a.title}{durationNote(a)}
                  {activityQuantity(a, adults + children) > 1 ? ` × ${activityQuantity(a, adults + children)}` : ""}
                </span>
                <span>{money(activityTotal(a, adults + children, 1, minutesFor(a)))}</span>
              </div>
            ))}
            {promo && promoDiscount > 0 && (
              <div className="row">
                <span className="k">{t("promoLine", { code: promo.code, percent: promo.percent })}</span>
                <span>-{money(promoDiscount)}</span>
              </div>
            )}
            <div className="row total">
              <span>{t("totalLabel")}</span>
              <span>{money(total - promoDiscount + optionsTotal + extrasTotal)}</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="tf-promo">{t("promoLabel")}</label>
            {promo ? (
              <div className="ride-option" style={{ justifyContent: "space-between" }}>
                <span>{t("promoApplied", { code: promo.code, percent: promo.percent })}</span>
                <button type="button" className="btn-quiet" onClick={removePromo}>{t("promoRemove")}</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="tf-promo"
                  maxLength={40}
                  autoCapitalize="characters"
                  placeholder={t("promoPlaceholder")}
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoState("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyPromo(); } }}
                />
                <button type="button" className="btn-quiet" disabled={promoState === "checking" || !promoInput.trim()} onClick={() => void applyPromo()}>
                  {t("promoApply")}
                </button>
              </div>
            )}
            {promoState === "invalid" && <span className="err">{t("promoInvalid")}</span>}
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

      {/* Step 5 ("Paiement") only ever appears as the post-submit confirmation
          above (the `booking` early return) — there is no payment gateway in
          this codebase, so nothing here is interactive before that point. */}

      <div className="book-actions">
        {(step > 0 || embedded) && (
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
