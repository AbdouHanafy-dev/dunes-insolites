"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TierAvailability } from "@/lib/api";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import type { Accommodation } from "@/lib/types";
import { NO_GUESTS, isPlaced, tierRates, unplaced, type Guests } from "@/lib/guestPricing";

/**
 * The accommodation-type cards (tent / room / suite) shared by every booking
 * form: camp page, circuit page and the global /book flow. Image and full
 * description on the left, the price in its own column on the right, "view
 * details" and the quantity stepper underneath.
 *
 * Tiers are priced per person per night, one price per guest type. When several
 * tiers are picked (multi mode) the guest says who sleeps in each: pass `party`,
 * `assignments` and `onAssign` to show that step.
 *
 * `selections` maps tier slug -> number of units. "single" behaves like radio
 * buttons (one tier), "multi" like checkboxes (a guest may combine tiers).
 */
export default function AccommodationPicker({
  name,
  items,
  selections,
  onChange,
  mode,
  availability,
  detailsHref,
  maxQty = 6,
  error,
  party,
  assignments,
  onAssign,
}: {
  name: string;
  items: Accommodation[];
  selections: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  mode: "single" | "multi";
  availability?: (slug: string) => TierAvailability | undefined;
  detailsHref?: (slug: string) => string | null;
  maxQty?: number;
  error?: string;
  /** The whole party, to place across the picked tiers. */
  party?: Guests;
  assignments?: Record<string, Guests>;
  onAssign?: (slug: string, guests: Guests) => void;
}) {
  const t = useTranslations("stayReservationForm");
  const selectedCount = Object.keys(selections).length;
  const assigning = Boolean(party && onAssign && assignments && mode === "multi" && selectedCount > 1);
  const left = party && assignments
    ? unplaced(party, Object.keys(selections).map((slug) => assignments[slug] ?? NO_GUESTS))
    : NO_GUESTS;

  function toggle(slug: string) {
    if (mode === "single") {
      onChange({ [slug]: selections[slug] ?? 1 });
      return;
    }
    const next = { ...selections };
    if (slug in next) delete next[slug];
    else next[slug] = 1;
    onChange(next);
  }

  function setQty(slug: string, qty: number) {
    onChange({ ...selections, [slug]: Math.min(maxQty, Math.max(1, qty)) });
  }

  return (
    <div className="field acc-cards" data-invalid={!!error}>
      {items.map((a) => {
        const av = availability?.(a.slug);
        const soldOut = av?.status === "UNAVAILABLE";
        const checked = a.slug in selections;
        const qty = selections[a.slug] ?? 1;
        const unitsLeft = av?.status === "AVAILABLE" && av.unitsAvailable != null && av.unitsAvailable <= 3
          ? av.unitsAvailable
          : null;
        const rates = tierRates(a);
        const href = detailsHref?.(a.slug) ?? null;
        return (
          <div className="acc-card" key={a.slug} data-selected={checked || undefined} data-disabled={soldOut || undefined}>
            <label className="acc-card-main">
              <input
                type={mode === "single" ? "radio" : "checkbox"}
                name={name}
                checked={checked}
                disabled={soldOut}
                onChange={() => toggle(a.slug)}
              />
              {isDisplayableImageSrc(a.image) && (
                <span className="acc-card-thumb" aria-hidden="true">
                  <Image src={a.image} alt="" fill sizes="120px" />
                </span>
              )}
              <span className="acc-card-copy">
                <strong>{a.title}</strong>
                {a.sleeps && <span className="acc-card-sleeps">{a.sleeps}</span>}
                {(a.tagline || a.description) && <span className="acc-card-desc">{a.tagline || a.description}</span>}
              </span>
              <span className="acc-card-price">
                {soldOut ? (
                  <em>{t("soldOutForDate")}</em>
                ) : (
                  <>
                    <b>€{rates.adult}</b>
                    <small>{t("tierPerPerson")}</small>
                    <small>
                      {t("tierChildPrice", { price: rates.child })} ·{" "}
                      {rates.infant > 0 ? t("tierInfantPrice", { price: rates.infant }) : t("tierInfantFree")}
                    </small>
                    {unitsLeft != null && <em>{t("tierUnitsLeft", { units: unitsLeft })}</em>}
                  </>
                )}
              </span>
            </label>
            {assigning && checked && party && (
              <TierGuests
                guests={assignments?.[a.slug] ?? NO_GUESTS}
                max={party}
                onChange={(g) => onAssign?.(a.slug, g)}
              />
            )}
            {(href || checked) && (
              <div className="acc-card-foot">
                {href ? (
                  <Link href={href} target="_blank" className="acc-card-details">
                    {t("viewDetails")} <span aria-hidden="true">→</span>
                  </Link>
                ) : <span />}
                {checked && (
                  <div className="guest-stepper">
                    <button type="button" onClick={() => setQty(a.slug, qty - 1)} disabled={qty <= 1} aria-label={t("decrease")}>−</button>
                    <output aria-label={`${qty} ${a.title}`}>{qty}</output>
                    <button type="button" onClick={() => setQty(a.slug, qty + 1)} disabled={qty >= maxQty} aria-label={t("increase")}>+</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {assigning && (
        <p className="hint acc-assign-status" data-ok={isPlaced(left) || undefined}>
          <strong>{t("assignTitle")}</strong> {t("assignHint")}{" "}
          {isPlaced(left) ? t("assignDone") : `${t("assignLeft")} ${left.adults} ${t("adults").toLowerCase()} · ${left.children} ${t("children").toLowerCase()} · ${left.infants} ${t("infants").toLowerCase()}`}
        </p>
      )}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

/** Adults / children / infants sleeping in one tier; never more than the party has of each. */
function TierGuests({ guests, max, onChange }: { guests: Guests; max: Guests; onChange: (g: Guests) => void }) {
  const t = useTranslations("stayReservationForm");
  const rows: Array<{ key: keyof Guests; label: string }> = [
    { key: "adults", label: t("adults") },
    { key: "children", label: t("children") },
    { key: "infants", label: t("infants") },
  ];
  return (
    <div className="acc-card-guests">
      {rows.map(({ key, label }) => (
        <div className="acc-card-guest-row" key={key}>
          <span>{label}</span>
          <div className="guest-stepper">
            <button type="button" onClick={() => onChange({ ...guests, [key]: guests[key] - 1 })} disabled={guests[key] <= 0} aria-label={`${t("decrease")} ${label}`}>−</button>
            <output aria-label={`${guests[key]} ${label}`}>{guests[key]}</output>
            <button type="button" onClick={() => onChange({ ...guests, [key]: guests[key] + 1 })} disabled={guests[key] >= max[key]} aria-label={`${t("increase")} ${label}`}>+</button>
          </div>
        </div>
      ))}
    </div>
  );
}
