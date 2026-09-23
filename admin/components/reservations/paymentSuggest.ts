import type { AdminPaymentPolicy } from "@/lib/api";

/**
 * What the payment rules would ask upfront for a booking - shown pre-filled so
 * staff see the figure and can change it (40 of 200, say). Display only: the
 * server recomputes from the same rules whenever the field is left empty, and
 * it is always the server that decides what the client is told.
 */
export function suggestedDeposit(policy: AdminPaymentPolicy | null, total: number): number {
  if (!policy || policy.depositMode === "NONE") return 0;
  if (policy.depositMode === "FULL") return total;
  return Math.round(((total * policy.depositPercent) / 100) * 1000) / 1000;
}
