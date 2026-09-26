/**
 * Display currencies. Every price on the site is held in euros (the catalogue's base
 * currency, and the currency a booking is made in); the visitor may ask to SEE prices in
 * dollars or Tunisian dinars. The conversion is only for display: nothing the guest submits
 * changes, and the server always prices in euros.
 */
export type Currency = "EUR" | "USD" | "TND";

export const CURRENCIES: readonly Currency[] = ["EUR", "USD", "TND"];

/**
 * Units of EUR worth one unit of the currency - the convention of GET /api/currency/rates - so
 * an amount in EUR divided by the rate is the amount in that currency.
 */
export type Rates = Record<Currency, number>;

/** The server's own defaults (3.4 TND per EUR, 2.5 TND per USD), used until the live rates arrive. */
export const DEFAULT_RATES: Rates = { EUR: 1, USD: 2.5 / 3.4, TND: 1 / 3.4 };

export const CURRENCY_STORAGE_KEY = "dunes.currency";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Rates from the API, ignoring anything that is not a usable positive number. */
export function normalizeRates(raw: unknown): Rates {
  const out: Rates = { ...DEFAULT_RATES };
  if (raw && typeof raw === "object") {
    for (const c of CURRENCIES) {
      const v = Number((raw as Record<string, unknown>)[c]);
      if (Number.isFinite(v) && v > 0) out[c] = v;
    }
  }
  out.EUR = 1; // the base is 1 by definition
  return out;
}

export function convert(eur: number, currency: Currency, rates: Rates): number {
  const rate = rates[currency];
  return rate > 0 ? eur / rate : eur;
}

/**
 * "€45", "$61", "153 TND" - the locale decides the symbol's place. Euros keep their cents
 * when they have some (a price of 45.5 stays 45.5); converted amounts are whole numbers,
 * since a converted price is an estimate.
 */
export function formatMoney(eur: number, currency: Currency, rates: Rates, locale: string): string {
  const converted = convert(eur, currency, rates);
  const whole = currency !== "EUR";
  const amount = whole ? Math.round(converted) : Math.round(converted * 100) / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/* -------------------------------------------------------------------------------------------
 * Price tokens. A translated sentence such as "From {price} per night" is one string, and a
 * server component cannot know the visitor's currency. So a call site passes the amount as a
 * token (priceToken(45)) into the message, and <PriceText> - a client component - swaps each
 * token for the amount in the chosen currency after the page is shown. Until then (and for
 * search engines) the token reads as euros.
 * ----------------------------------------------------------------------------------------- */

const OPEN = "⟦";
const CLOSE = "⟧";
const TOKEN = new RegExp(`${OPEN}(-?\\d+(?:\\.\\d+)?)(?:@([A-Z]{3}))?${CLOSE}`, "g");

/** The amount as a token. Euros by default; `from` says it is written in another currency (an editorial "80 TND"). */
export function priceToken(amount: number | null | undefined, from: Currency = "EUR"): string {
  const n = amount != null && Number.isFinite(amount) ? amount : 0;
  return `${OPEN}${n}${from === "EUR" ? "" : `@${from}`}${CLOSE}`;
}

/**
 * An editorial price written as text ("80 TND", "35 €", "120") turned into a token so it follows the
 * visitor's currency too. Anything that is not just an amount and a currency is returned untouched.
 */
export function priceStringToToken(text: string): string {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(TND|DT|EUR|€|USD|\$)?\s*$/i.exec(text);
  if (!m) return text;
  const amount = Number(m[1].replace(",", "."));
  const unit = (m[2] ?? "").toUpperCase();
  const from: Currency = unit === "USD" || unit === "$" ? "USD" : unit === "TND" || unit === "DT" ? "TND" : "EUR";
  return priceToken(amount, from);
}

export type PriceChunk = string | { amount: number; from: Currency };

/** Splits a message into its text and its price tokens, in order. */
export function splitPriceTokens(text: string): PriceChunk[] {
  const chunks: PriceChunk[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) chunks.push(text.slice(last, at));
    chunks.push({ amount: Number(match[1]), from: (match[2] as Currency | undefined) ?? "EUR" });
    last = at + match[0].length;
  }
  if (last < text.length) chunks.push(text.slice(last));
  return chunks;
}

/** The message with every token written out as money - for places that need a plain string. */
export function resolvePriceTokens(
  text: string,
  format: (eur: number) => string,
  toEur: (amount: number, from: Currency) => number = (amount) => amount,
): string {
  return text.replace(TOKEN, (_all, n: string, from?: string) => format(toEur(Number(n), (from as Currency | undefined) ?? "EUR")));
}
