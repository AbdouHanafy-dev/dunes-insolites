"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useLocale } from "next-intl";
import { getCountries, getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

// The package only types `{ title }`, but every generated flag component
// spreads its remaining props onto the underlying <svg> — className works
// at runtime and is how these are sized (see .phone-input-flag in globals.css).
type FlagComponent = ComponentType<{ title?: string; className?: string }>;

function countryName(locale: string, iso: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(iso) ?? iso;
  } catch {
    return iso;
  }
}

/**
 * A phone field split into a country picker (flag + dial code, searchable,
 * every country libphonenumber-js knows about) and the local number, styled
 * as one cohesive control. The dial code is composed into the submitted
 * value by the caller — this component only edits the local part.
 */
export default function PhoneInput({
  id,
  country,
  onCountryChange,
  value,
  onChange,
  invalid,
  searchPlaceholder,
}: {
  id?: string;
  country: Country;
  onCountryChange: (iso: Country) => void;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  searchPlaceholder: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(
    () => getCountries()
      .map((iso) => ({ iso, name: countryName(locale, iso), dial: `+${getCountryCallingCode(iso)}` }))
      .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase() === q,
    );
  }, [countries, query]);

  const selected = countries.find((c) => c.iso === country) ?? countries[0];
  const SelectedFlag = selected ? (flags[selected.iso as Country] as FlagComponent | undefined) : undefined;

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
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  return (
    <div className="phone-input" data-invalid={invalid || undefined} ref={rootRef}>
      <button
        type="button"
        className="phone-input-country"
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {SelectedFlag && selected && <SelectedFlag title={selected.name} className="phone-input-flag" />}
        <span>{selected?.dial}</span>
        <ChevronIcon />
      </button>
      <input
        id={id}
        className="phone-input-number"
        type="tel"
        value={value}
        autoComplete="tel-national"
        onChange={(e) => onChange(e.target.value)}
      />

      {open && (
        <div className="date-picker-popover list-select-popover phone-input-popover" role="listbox">
          <input
            ref={searchRef}
            type="text"
            className="phone-input-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="phone-input-options">
            {filtered.map((c) => {
              const CountryFlagIcon = flags[c.iso as Country] as FlagComponent | undefined;
              return (
                <button
                  key={c.iso}
                  type="button"
                  className="list-select-option"
                  role="option"
                  aria-selected={c.iso === country}
                  data-selected={c.iso === country || undefined}
                  onClick={() => {
                    onCountryChange(c.iso as Country);
                    setOpen(false);
                  }}
                >
                  {CountryFlagIcon && <CountryFlagIcon title={c.name} className="phone-input-flag" />}
                  <span>{c.name}</span>
                  <span className="phone-input-dial">{c.dial}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="date-picker-icon">
      <path d="M8 11.5 2.5 6l1-1L8 9.5 12.5 5l1 1z" />
    </svg>
  );
}
