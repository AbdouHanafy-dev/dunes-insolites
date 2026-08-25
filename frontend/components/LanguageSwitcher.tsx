"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Flag from "@/components/Flag";
import { locales } from "@/lib/site";

/**
 * The control is real, the locales are not — only English exists until
 * next-intl is wired up. Pending languages render as disabled rather than as
 * working options, so nothing silently does nothing when clicked.
 */
export default function LanguageSwitcher({
  panelAnchor = "self",
}: {
  /**
   * "self" (default, used in the mobile drawer) opens the panel right under
   * this button. "header" (the floating desktop pill) measures the whole
   * `#header` element instead — the button sits in the header's *top*
   * utility row, so anchoring to the button alone would land the panel over
   * the main nav row underneath it rather than clear of the header.
   */
  panelAnchor?: "self" | "header";
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();
  const ref = useRef<HTMLDivElement>(null);
  const active = locales.find((l) => l.available) ?? locales[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // A fixed-position panel measured against the header would otherwise
    // drift out of place the moment the page scrolls under it.
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  const toggle = () => {
    if (!open && panelAnchor === "header" && ref.current) {
      const header = document.getElementById("header");
      const headerRect = (header ?? ref.current).getBoundingClientRect();
      const btnRect = ref.current.getBoundingClientRect();
      setPanelStyle({
        position: "fixed",
        top: headerRect.bottom + 10,
        right: window.innerWidth - btnRect.right,
        left: "auto",
      });
    }
    setOpen((v) => !v);
  };

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="lang-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${active.label}`}
        onClick={toggle}
      >
        <Flag code={active.code} className="flag" />
        <span className="chev" aria-hidden="true" />
      </button>

      {open && (
        <ul className="lang-menu" style={panelStyle} role="listbox" aria-label="Language">
          {locales.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === active.code}
                disabled={!l.available}
                onClick={() => setOpen(false)}
              >
                <Flag code={l.code} className="flag" />
                <span className="name">{l.label}</span>
                {l.code === active.code && (
                  <svg
                    className="check"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 12.5 9.5 18 20 6"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {!l.available && <span className="soon">Soon</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
