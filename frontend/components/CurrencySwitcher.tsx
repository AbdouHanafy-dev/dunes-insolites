"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/components/CurrencyProvider";
import { CURRENCIES, type Currency } from "@/lib/currency";

/** The currency's name in the visitor's language ("Euro", "Dinar tunisien", "dollar des États-Unis"). */
function currencyName(code: Currency, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Next to the language switcher: which currency the site shows its prices in. It only changes
 * how prices are displayed - bookings are made in euros - and reuses the language menu's look.
 */
export default function CurrencySwitcher({
  panelAnchor = "self",
  showName = false,
}: {
  /** "header" anchors the panel under the whole floating header, like the language menu. */
  panelAnchor?: "self" | "header";
  showName?: boolean;
}) {
  const t = useTranslations("currencySwitcher");
  const locale = useLocale();
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
        insetInlineEnd: window.innerWidth - btnRect.right,
        insetInlineStart: "auto",
      });
    }
    setOpen((v) => !v);
  };

  return (
    <div className="lang currency" ref={ref}>
      <button
        type="button"
        className="lang-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("current", { currency: currencyName(currency, locale) })}
        onClick={toggle}
      >
        <span className="currency-code">{currency}</span>
        {showName && <span className="lang-active-name">{currencyName(currency, locale)}</span>}
        <span className="chev" aria-hidden="true" />
      </button>

      {open && (
        <ul className="lang-menu" style={panelStyle} role="listbox" aria-label={t("label")}>
          {CURRENCIES.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === currency}
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
              >
                <span className="currency-code">{code}</span>
                <span className="name">{currencyName(code, locale)}</span>
              </button>
            </li>
          ))}
          <li className="currency-note">{t("note")}</li>
        </ul>
      )}
    </div>
  );
}
