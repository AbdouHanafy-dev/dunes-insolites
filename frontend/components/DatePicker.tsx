"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { addMonths, buildGrid, fromISO, startOfMonth, toISO } from "@/lib/dateGrid";

/**
 * A real month-grid calendar, replacing the native `<input type="date">` —
 * some browsers/OSes render that as a plain dropdown/list rather than a
 * visual calendar. Self-contained: no date library, since the site had none
 * and the grid math here is a dozen lines. `min` (ISO yyyy-mm-dd) disables
 * everything before it, same "no past dates" contract every booking flow
 * already relies on via the native input's own `min` attribute.
 */
export default function DatePicker({
  id,
  value,
  onChange,
  min,
  invalid,
  unavailable,
  onMonthChange,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  invalid?: boolean;
  /** ISO dates known to be fully booked for the currently visible month - greyed out, not pickable. */
  unavailable?: Set<string>;
  /** Fired on open and on month navigation, so the parent can fetch that month's availability. */
  onMonthChange?: (viewMonth: Date) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("datePicker");
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected ?? fromISO(min ?? "") ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) onMonthChange?.(viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, viewMonth]);

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

  function toggle() {
    setOpen((o) => {
      if (!o) setViewMonth(startOfMonth(selected ?? fromISO(min ?? "") ?? new Date()));
      return !o;
    });
  }

  function pick(day: Date) {
    const iso = toISO(day);
    if (min && iso < min) return;
    onChange(iso);
    setOpen(false);
  }

  const grid = buildGrid(viewMonth);
  const todayIso = toISO(new Date());
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);
  const weekdayLabels = buildGrid(startOfMonth(new Date(2024, 0, 1))) // any Monday-first week
    .slice(0, 7)
    .map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d));
  const displayLabel = selected
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(selected)
    : t("placeholder");

  return (
    <div className="date-picker" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="date-picker-trigger"
        data-invalid={invalid || undefined}
        data-placeholder={!selected || undefined}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{displayLabel}</span>
        {/* Bootstrap Icons "calendar3" (MIT), inlined as static path data -
            no icon font/library at runtime, same self-contained approach
            as the rest of this component. */}
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
      </button>

      {open && (
        <div className="date-picker-popover" role="dialog" aria-label={t("placeholder")}>
          <div className="date-picker-header">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              aria-label={t("previousMonth")}
            >
              ‹
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label={t("nextMonth")}
            >
              ›
            </button>
          </div>
          <div className="date-picker-weekdays">
            {weekdayLabels.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {grid.map((day) => {
              const iso = toISO(day);
              const outside = day.getMonth() !== viewMonth.getMonth();
              const full = !!unavailable?.has(iso);
              const disabled = (!!min && iso < min) || full;
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => pick(day)}
                  disabled={disabled}
                  data-outside={outside || undefined}
                  data-selected={iso === value || undefined}
                  data-today={iso === todayIso || undefined}
                  data-unavailable={full || undefined}
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
