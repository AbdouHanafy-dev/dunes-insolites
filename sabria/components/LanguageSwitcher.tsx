"use client";

import { useEffect, useRef, useState } from "react";
import { locales } from "@/lib/site";

/**
 * The control is real, the locales are not — only English exists until
 * next-intl is wired up. Pending languages render as disabled rather than as
 * working options, so nothing silently does nothing when clicked.
 */
export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = locales.find((l) => l.available) ?? locales[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="lang-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="4" ry="9.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {active.short}
        <span className="chev" aria-hidden="true" />
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label="Language">
          {locales.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === active.code}
                disabled={!l.available}
                onClick={() => setOpen(false)}
              >
                <span className="code">{l.short}</span>
                <span className="name">{l.label}</span>
                {!l.available && <span className="soon">Soon</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
