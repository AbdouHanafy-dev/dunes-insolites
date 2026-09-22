"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A themed dropdown list replacing the native `<select>` for small fixed
 * option sets (departure/return city) — same trigger+popover shell as
 * DatePicker, so it matches the rest of the booking flow's visual language
 * instead of the browser's own select styling.
 */
export default function ListSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  labels,
  placeholder,
  invalid,
}: {
  id?: string;
  value: T | "";
  onChange: (value: T | "") => void;
  options: readonly T[];
  labels: Record<T, string>;
  placeholder: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
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

  function pick(next: T | "") {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="list-select" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="date-picker-trigger"
        data-invalid={invalid || undefined}
        data-placeholder={!value || undefined}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value ? labels[value] : placeholder}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="date-picker-popover list-select-popover" role="listbox">
          <button
            type="button"
            className="list-select-option"
            role="option"
            aria-selected={value === ""}
            data-selected={value === "" || undefined}
            onClick={() => pick("")}
          >
            <span>{placeholder}</span>
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="list-select-option"
              role="option"
              aria-selected={value === opt}
              data-selected={value === opt || undefined}
              onClick={() => pick(opt)}
            >
              <PinIcon />
              <span>{labels[opt]}</span>
              {value === opt && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="date-picker-icon">
      <path d="M8 11.5 2.5 6l1-1L8 9.5 12.5 5l1 1z" />
    </svg>
  );
}

function PinIcon() {
  // Bootstrap Icons "geo-alt" (MIT), inlined as static path data.
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="currentColor" className="list-select-pin">
      <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="list-select-check">
      <path d="M13.485 1.929a1 1 0 0 1 0 1.414l-7.07 7.071a1 1 0 0 1-1.415 0L2.03 7.444a1 1 0 1 1 1.414-1.414l2.263 2.263 6.364-6.364a1 1 0 0 1 1.414 0" />
    </svg>
  );
}
