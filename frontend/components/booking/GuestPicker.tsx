"use client";

import { useTranslations } from "next-intl";
import { MAX_INFANTS, MAX_PARTY_SIZE } from "@/lib/types";

/**
 * "Who's coming" - adults, children and infants steppers. One component so the camp
 * page, the circuit page and the global /book page all look and behave the
 * same: at least one adult, and at most MAX_PARTY_SIZE adults + children in total.
 * Infants (0-3) sit outside that limit: they are priced on their own and take no place.
 */
export default function GuestPicker({
  adults,
  kids,
  infants,
  onChange,
  error,
}: {
  adults: number;
  kids: number;
  infants: number;
  onChange: (adults: number, kids: number, infants: number) => void;
  error?: string;
}) {
  const t = useTranslations("stayReservationForm");
  const party = adults + kids;

  return (
    <div className="field" data-invalid={!!error}>
      <label>{t("whosComing")}</label>
      <div className="guest-picker">
        <div className="guest-row">
          <div><strong>{t("adults")}</strong><span>{t("adultsAge")}</span></div>
          <div className="guest-stepper">
            <button type="button" onClick={() => onChange(adults - 1, kids, infants)} disabled={adults <= 1} aria-label={t("decrease")}>−</button>
            <output aria-label={`${adults} ${t("adults")}`}>{adults}</output>
            <button type="button" onClick={() => onChange(adults + 1, kids, infants)} disabled={party >= MAX_PARTY_SIZE} aria-label={t("increase")}>+</button>
          </div>
        </div>
        <div className="guest-row">
          <div><strong>{t("children")}</strong><span>{t("childrenAge")}</span></div>
          <div className="guest-stepper">
            <button type="button" onClick={() => onChange(adults, kids - 1, infants)} disabled={kids <= 0} aria-label={t("decrease")}>−</button>
            <output aria-label={`${kids} ${t("children")}`}>{kids}</output>
            <button type="button" onClick={() => onChange(adults, kids + 1, infants)} disabled={party >= MAX_PARTY_SIZE} aria-label={t("increase")}>+</button>
          </div>
        </div>
        <div className="guest-row">
          <div><strong>{t("infants")}</strong><span>{t("infantsAge")}</span></div>
          <div className="guest-stepper">
            <button type="button" onClick={() => onChange(adults, kids, infants - 1)} disabled={infants <= 0} aria-label={t("decrease")}>−</button>
            <output aria-label={`${infants} ${t("infants")}`}>{infants}</output>
            <button type="button" onClick={() => onChange(adults, kids, infants + 1)} disabled={infants >= MAX_INFANTS} aria-label={t("increase")}>+</button>
          </div>
        </div>
      </div>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
