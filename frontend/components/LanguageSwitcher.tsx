"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import Flag from "@/components/Flag";
import { locales } from "@/lib/site";

/**
 * All 6 locales are real routes now (multi-language rollout) — switching
 * navigates to the same page in the chosen language via next-intl's
 * locale-aware router, rather than the old disabled/"Soon" placeholder
 * state this control used to render.
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
  const t = useTranslations("languageSwitcher");
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();
  const ref = useRef<HTMLDivElement>(null);
  const active = locales.find((l) => l.code === activeLocale) ?? locales[0];

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
      // Anchored to the reading-end edge (flips under RTL via `insetInlineEnd`).
      setPanelStyle({
        position: "fixed",
        top: headerRect.bottom + 10,
        insetInlineEnd: window.innerWidth - btnRect.right,
        insetInlineStart: "auto",
      });
    }
    setOpen((v) => !v);
  };

  const switchTo = (code: string) => {
    setOpen(false);
    if (code === activeLocale) return;
    router.replace(pathname, { locale: code });
  };

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="lang-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("currentLanguage", { language: active.label })}
        onClick={toggle}
      >
        <Flag code={active.code} className="flag" />
        <span className="chev" aria-hidden="true" />
      </button>

      {open && (
        <ul className="lang-menu" style={panelStyle} role="listbox" aria-label={t("label")}>
          {locales.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === active.code}
                onClick={() => switchTo(l.code)}
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
