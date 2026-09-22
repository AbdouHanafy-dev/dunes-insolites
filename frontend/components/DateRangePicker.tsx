"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { addDaysISO, addMonths, buildGrid, fromISO, startOfMonth, toISO } from "@/lib/dateGrid";

/**
 * A single shared calendar for picking an arrival + departure pair, capped at
 * `maxNights` nights — replaces two independent DatePicker instances that
 * were only loosely kept consistent (departure's `min` bumped when arrival
 * changed). First click sets arrival, second click sets departure (clamped to
 * `maxNights` and re-openable to restart); clicking before/on the current
 * arrival restarts the selection. Same hand-rolled grid approach as
 * DatePicker — no date library, shares its `lib/dateGrid` helpers.
 */
export default function DateRangePicker({
  arrivalId,
  departureId,
  arrivalLabel,
  departureLabel,
  min,
  maxNights,
  start,
  end,
  onChange,
  errorStart,
  errorEnd,
}: {
  arrivalId?: string;
  departureId?: string;
  arrivalLabel: string;
  departureLabel: string;
  min?: string;
  maxNights: number;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  errorStart?: string;
  errorEnd?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("datePicker");
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(fromISO(start) ?? fromISO(min ?? "") ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openPopover() {
    setViewMonth(startOfMonth(fromISO(start) ?? fromISO(min ?? "") ?? new Date()));
    setOpen(true);
  }

  const maxEnd = start ? addDaysISO(start, maxNights) : "";

  function pick(day: Date) {
    const iso = toISO(day);
    if (min && iso < min) return;
    if (!start || (start && end)) {
      onChange(iso, "");
      return;
    }
    if (iso <= start) {
      onChange(iso, "");
      return;
    }
    onChange(start, maxEnd && iso > maxEnd ? maxEnd : iso);
    setOpen(false);
  }

  const grid = buildGrid(viewMonth);
  const todayIso = toISO(new Date());
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);
  const weekdayLabels = buildGrid(startOfMonth(new Date(2024, 0, 1)))
    .slice(0, 7)
    .map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d));

  const startDate = fromISO(start);
  const endDate = fromISO(end);
  const arrivalDisplay = startDate
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(startDate)
    : t("placeholder");
  const departureDisplay = endDate
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(endDate)
    : t("placeholder");

  return (
    <div className="date-range-picker" ref={rootRef}>
      <div className="date-range-fields">
        <div className="field" data-invalid={!!errorStart}>
          <label htmlFor={arrivalId}>{arrivalLabel}</label>
          <button
            type="button"
            id={arrivalId}
            className="date-picker-trigger"
            data-invalid={errorStart || undefined}
            data-placeholder={!start || undefined}
            onClick={openPopover}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <span>{arrivalDisplay}</span>
            <CalendarIcon />
          </button>
          {errorStart && <span className="err">{errorStart}</span>}
        </div>
        <div className="field" data-invalid={!!errorEnd}>
          <label htmlFor={departureId}>{departureLabel}</label>
          <button
            type="button"
            id={departureId}
            className="date-picker-trigger"
            data-invalid={errorEnd || undefined}
            data-placeholder={!end || undefined}
            onClick={openPopover}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <span>{departureDisplay}</span>
            <CalendarIcon />
          </button>
          {errorEnd && <span className="err">{errorEnd}</span>}
        </div>
      </div>

      {open && (
        <div className="date-picker-popover date-range-popover" role="dialog" aria-label={arrivalLabel}>
          <div className="date-picker-header">
            <button type="button" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label={t("previousMonth")}>‹</button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label={t("nextMonth")}>›</button>
          </div>
          <div className="date-picker-weekdays">
            {weekdayLabels.map((w, i) => (<span key={i}>{w}</span>))}
          </div>
          <div className="date-picker-grid">
            {grid.map((day) => {
              const iso = toISO(day);
              const outside = day.getMonth() !== viewMonth.getMonth();
              const beforeMin = !!min && iso < min;
              const beyondMax = !!start && !end && !!maxEnd && iso > maxEnd;
              const disabled = beforeMin || beyondMax;
              const isBoundary = iso === start || iso === end;
              const inRange = !!start && !!end && iso > start && iso < end;
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => pick(day)}
                  disabled={disabled}
                  data-outside={outside || undefined}
                  data-selected={isBoundary || undefined}
                  data-in-range={inRange || undefined}
                  data-today={iso === todayIso || undefined}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  // Bootstrap Icons "calendar3" (MIT), inlined as static path data - see
  // DatePicker.tsx for the same self-contained approach.
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="date-picker-icon bi bi-calendar3"
    >
      <path d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857z" />
      <path d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
    </svg>
  );
}
