/** The owner's exchange rates as the back office returns them: three amounts worth the same. */
export type AdminCurrencyRates = {
  eurAmount: number;
  usdAmount: number;
  tndAmount: number;
  usdPerEur: number;
  tndPerEur: number;
  updatedAt: string | null;
};

/** A typed amount ("13,6" or "13.6") as a number; null when empty or not a positive number. */
export function parseAmount(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

/** What one euro is worth, from the three equivalent amounts; null until all three are valid. */
export function perEuro(eur: number | null, usd: number | null, tnd: number | null): { usd: number; tnd: number } | null {
  if (eur == null || usd == null || tnd == null) return null;
  return { usd: usd / eur, tnd: tnd / eur };
}

/** "1,2" / "3,4": up to 4 decimals without trailing zeros, in French notation. */
export function formatRate(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value);
}
