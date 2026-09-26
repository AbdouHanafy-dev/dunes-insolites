/** A partner promo code with what it brought in, as the back office returns it. */
export type AdminPromoCode = {
  promoCodeId: string;
  code: string;
  partnerName: string;
  discountPercent: number;
  commissionPercent: number | null;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  /** Confirmed, checked-in or completed reservations. */
  reservations: number;
  pendingReservations: number;
  circuitRevenue: number;
  discountGiven: number;
  /** Null while no commission rate is set. */
  commissionDue: number | null;
};

/** "10 %" / "12,5 %": up to two decimals, French notation. */
export function percentLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} %`;
}

/** A typed percentage ("12,5" or "12.5") as a number; null when empty or not a number. */
export function parsePercent(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) ? n : null;
}

/** Where the code stands today: switched off, not started, running, or over. */
export function validityOf(
  code: Pick<AdminPromoCode, "active" | "validFrom" | "validUntil">,
  today: string,
): { key: "off" | "soon" | "live" | "over"; label: string } {
  if (!code.active) return { key: "off", label: "Désactivé" };
  if (code.validFrom && today < code.validFrom) return { key: "soon", label: `À partir du ${code.validFrom}` };
  if (code.validUntil && today > code.validUntil) return { key: "over", label: "Expiré" };
  return { key: "live", label: code.validUntil ? `Actif jusqu’au ${code.validUntil}` : "Actif" };
}

/** The codes' totals, for the strip above the cards. */
export function promoTotals(codes: readonly AdminPromoCode[]) {
  const commissions = codes.map((c) => c.commissionDue).filter((v): v is number => v != null);
  return {
    reservations: codes.reduce((sum, c) => sum + c.reservations, 0),
    pending: codes.reduce((sum, c) => sum + c.pendingReservations, 0),
    revenue: codes.reduce((sum, c) => sum + c.circuitRevenue, 0),
    discount: codes.reduce((sum, c) => sum + c.discountGiven, 0),
    commission: commissions.reduce((sum, v) => sum + v, 0),
    withoutRate: codes.filter((c) => c.commissionPercent == null).length,
  };
}
