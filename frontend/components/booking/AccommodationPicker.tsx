"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TierAvailability } from "@/lib/api";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import type { Accommodation } from "@/lib/types";

/**
 * The accommodation-type cards (tent / room / suite) shared by every booking
 * form: camp page, circuit page and the global /book flow. Image and full
 * description on the left, the price in its own column on the right, "view
 * details" and the quantity stepper underneath.
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
}) {
  const t = useTranslations("stayReservationForm");

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
        const left = av?.status === "AVAILABLE" && av.unitsAvailable != null && av.unitsAvailable <= 3
          ? av.unitsAvailable
          : null;
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
                    <b>€{a.priceFrom}</b>
                    <small>{t("tierPerNight")}</small>
                    {left != null && <em>{t("tierUnitsLeft", { units: left })}</em>}
                  </>
                )}
              </span>
            </label>
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
      {error && <span className="err">{error}</span>}
    </div>
  );
}
