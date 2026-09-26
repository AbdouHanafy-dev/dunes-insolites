"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_RATES,
  formatMoney,
  isCurrency,
  resolvePriceTokens,
  type Currency,
  type Rates,
} from "@/lib/currency";

type CurrencyValue = {
  currency: Currency;
  setCurrency: (next: Currency) => void;
  /** An amount in euros, written in the chosen currency ("€45", "$61", "153 TND"). */
  format: (eur: number | null | undefined) => string;
  /** An amount written in some currency, as euros: how an editorial "80 TND" joins the conversion. */
  toEur: (amount: number, from: Currency) => number;
  /** A sentence carrying price tokens (see lib/currency), written out in the chosen currency. */
  resolve: (text: string) => string;
};

const CurrencyContext = createContext<CurrencyValue | null>(null);

const CHANGE_EVENT = "dunes:currency";

function readStored(): Currency {
  try {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrency(saved) ? saved : "EUR";
  } catch {
    return "EUR"; // private window or blocked storage: euros
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The visitor's display currency. Pages are rendered once, in euros, and cached; the choice
 * lives in the browser (localStorage), so a visitor who picked dinars sees dinars from the
 * first client render on without any page becoming dynamic. Server and first client render
 * both use euros, so there is no hydration mismatch.
 */
export function CurrencyProvider({ rates = DEFAULT_RATES, children }: { rates?: Rates; children: ReactNode }) {
  const locale = useLocale();
  const currency = useSyncExternalStore(subscribe, readStored, () => "EUR" as Currency);

  const setCurrency = useCallback((next: Currency) => {
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // not persisted, but still applied for this visit
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo<CurrencyValue>(() => {
    const format = (eur: number | null | undefined) => formatMoney(eur ?? 0, currency, rates, locale);
    const toEur = (amount: number, from: Currency) => amount * rates[from];
    return { currency, setCurrency, format, toEur, resolve: (text) => resolvePriceTokens(text, format, toEur) };
  }, [currency, rates, locale, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/** Outside a provider (a test, an isolated component) prices simply stay in euros. */
export function useCurrency(): CurrencyValue {
  const ctx = useContext(CurrencyContext);
  const locale = useLocale();
  if (ctx) return ctx;
  const format = (eur: number | null | undefined) => formatMoney(eur ?? 0, "EUR", DEFAULT_RATES, locale);
  const toEur = (amount: number, from: Currency) => amount * DEFAULT_RATES[from];
  return { currency: "EUR", setCurrency: () => {}, format, toEur, resolve: (text) => resolvePriceTokens(text, format, toEur) };
}
