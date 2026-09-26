import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATES,
  priceStringToToken,
  convert,
  formatMoney,
  isCurrency,
  normalizeRates,
  priceToken,
  resolvePriceTokens,
  splitPriceTokens,
} from "./currency";

describe("convert", () => {
  it("divides by the rate: 1 EUR = 3.4 TND and 1.36 USD by default", () => {
    expect(convert(100, "EUR", DEFAULT_RATES)).toBe(100);
    expect(convert(100, "TND", DEFAULT_RATES)).toBeCloseTo(340, 6);
    expect(convert(100, "USD", DEFAULT_RATES)).toBeCloseTo(136, 6);
  });
});

describe("normalizeRates", () => {
  it("keeps good rates, falls back on bad ones and pins the euro to 1", () => {
    const rates = normalizeRates({ EUR: 7, TND: 0.25, USD: "nope" });
    expect(rates.EUR).toBe(1);
    expect(rates.TND).toBe(0.25);
    expect(rates.USD).toBe(DEFAULT_RATES.USD);
    expect(normalizeRates(null)).toEqual(DEFAULT_RATES);
  });
});

describe("formatMoney", () => {
  it("shows euros as euros, keeping cents only when there are some", () => {
    expect(formatMoney(45, "EUR", DEFAULT_RATES, "en")).toBe("€45");
    expect(formatMoney(45.5, "EUR", DEFAULT_RATES, "en")).toBe("€45.5");
  });
  it("rounds a converted price to a whole number", () => {
    expect(formatMoney(45, "USD", DEFAULT_RATES, "en")).toBe("$61");
    expect(formatMoney(45, "TND", DEFAULT_RATES, "en")).toMatch(/153/);
    expect(formatMoney(45, "TND", DEFAULT_RATES, "en")).toMatch(/TND/);
  });
  it("puts the symbol where the language puts it", () => {
    expect(formatMoney(45, "EUR", DEFAULT_RATES, "fr").replace(/\s/g, " ")).toMatch(/^45\s?€$/);
  });
});

describe("price tokens", () => {
  it("round-trips an amount through a sentence", () => {
    const sentence = `From ${priceToken(45)} per night, or ${priceToken(12.5)} for a child`;
    expect(splitPriceTokens(sentence)).toEqual([
      "From ", { amount: 45, from: "EUR" }, " per night, or ", { amount: 12.5, from: "EUR" }, " for a child",
    ]);
  });
  it("writes a sentence out with a formatter", () => {
    expect(resolvePriceTokens(`From ${priceToken(45)}`, (n) => `€${n}`)).toBe("From €45");
  });
  it("leaves a sentence with no token alone", () => {
    expect(splitPriceTokens("Free")).toEqual(["Free"]);
    expect(resolvePriceTokens("Free", () => "x")).toBe("Free");
  });
  it("never lets a non-number through", () => {
    expect(priceToken(Number.NaN)).toBe(priceToken(0));
  });
});

describe("editorial prices", () => {
  it("turns a written amount into a token in its own currency", () => {
    expect(splitPriceTokens(priceStringToToken("80 TND"))).toEqual([{ amount: 80, from: "TND" }]);
    expect(splitPriceTokens(priceStringToToken("35 €"))).toEqual([{ amount: 35, from: "EUR" }]);
    expect(splitPriceTokens(priceStringToToken("12,5 DT"))).toEqual([{ amount: 12.5, from: "TND" }]);
  });
  it("leaves anything that is more than an amount alone", () => {
    expect(priceStringToToken("Starting from")).toBe("Starting from");
    expect(priceStringToToken("80 TND per person")).toBe("80 TND per person");
  });
  it("converts a written amount from its own currency", () => {
    const sentence = priceToken(80, "TND");
    expect(resolvePriceTokens(sentence, (eur) => String(Math.round(eur * 100) / 100), (amount, from) => amount * DEFAULT_RATES[from])).toBe("23.53");
  });
});

describe("isCurrency", () => {
  it("accepts only the three currencies", () => {
    expect(isCurrency("TND")).toBe(true);
    expect(isCurrency("GBP")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});
