"use client";

import { useTranslations } from "next-intl";
import { MAX_PARTY_SIZE } from "@/lib/types";

/**
 * "Who's coming" - adults and children steppers. One component so the camp
 * page, the circuit page and the global /book page all look and behave the
 * same: at least one adult, and at most MAX_PARTY_SIZE travelers in total.
 */
export default function GuestPicker({
  adults,
  kids,
  onChange,
  error,
}: {
  adults: number;
  kids: number;
  onChange: (adults: number, kids: number) => void;
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
            <button type="button" onClick={() => onChange(adults - 1, kids)} disabled={adults <= 1} aria-label={t("decrease")}>−</button>
            <output aria-label={`${adults} ${t("adults")}`}>{adults}</output>
            <button type="button" onClick={() => onChange(adults + 1, kids)} disabled={party >= MAX_PARTY_SIZE} aria-label={t("increase")}>+</button>
          </div>
        </div>
        <div className="guest-row">
          <div><strong>{t("children")}</strong><span>{t("childrenAge")}</span></div>
          <div className="guest-stepper">
            <button type="button" onClick={() => onChange(adults, kids - 1)} disabled={kids <= 0} aria-label={t("decrease")}>−</button>
            <output aria-label={`${kids} ${t("children")}`}>{kids}</output>
            <button type="button" onClick={() => onChange(adults, kids + 1)} disabled={party >= MAX_PARTY_SIZE} aria-label={t("increase")}>+</button>
          </div>
        </div>
      </div>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
