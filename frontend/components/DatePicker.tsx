"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// Monday-first 6x7 grid, including the leading/trailing days of the
// adjacent months so every week row stays full.
function buildGrid(monthStart: Date): Date[] {
  const jsWeekday = monthStart.getDay(); // 0=Sun..6=Sat
  const leading = (jsWeekday + 6) % 7; // days since Monday
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - leading);
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
}

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
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  invalid?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("datePicker");
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected ?? fromISO(min ?? "") ?? new Date()));
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
        <span aria-hidden="true">📅</span>
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
              const disabled = !!min && iso < min;
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => pick(day)}
                  disabled={disabled}
                  data-outside={outside || undefined}
                  data-selected={iso === value || undefined}
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
