import type { Accommodation } from "@/lib/types";

/** Who is travelling, or who sleeps somewhere: adults (18+), children (3-18), infants (0-3). */
export type Guests = { adults: number; children: number; infants: number };

export const NO_GUESTS: Guests = { adults: 0, children: 0, infants: 0 };

type PerPerson = { adult: number; child: number; infant: number };

/** Adult / child / infant price of a tier; a missing child price follows the adult, a missing infant price is free. */
export function tierRates(tier: Pick<Accommodation, "priceFrom" | "adultPrice" | "childPrice" | "infantPrice">): PerPerson {
  const adult = tier.adultPrice ?? tier.priceFrom;
  return { adult, child: tier.childPrice ?? adult, infant: tier.infantPrice ?? 0 };
}

/** One night for these guests in this tier: each guest type at its own price. Display estimate only. */
export function tierPerNight(
  tier: Pick<Accommodation, "priceFrom" | "adultPrice" | "childPrice" | "infantPrice">,
  guests: Guests,
): number {
  const r = tierRates(tier);
  return round2(r.adult * guests.adults + r.child * guests.children + r.infant * guests.infants);
}

/** Guests left over once the tiers have taken theirs; all zeros means everyone has a place. */
export function unplaced(party: Guests, assigned: Guests[]): Guests {
  const sum = assigned.reduce(
    (acc, g) => ({ adults: acc.adults + g.adults, children: acc.children + g.children, infants: acc.infants + g.infants }),
    NO_GUESTS,
  );
  return { adults: party.adults - sum.adults, children: party.children - sum.children, infants: party.infants - sum.infants };
}

export function isPlaced(left: Guests): boolean {
  return left.adults === 0 && left.children === 0 && left.infants === 0;
}

/**
 * The guests each tier gets. One tier takes the whole party; with several the
 * guest's own assignment is used (a tier they have not touched yet gets nobody).
 */
export function guestsPerTier(
  slugs: string[],
  party: Guests,
  assignments: Record<string, Guests>,
): Record<string, Guests> {
  if (slugs.length === 1) return { [slugs[0]]: party };
  return Object.fromEntries(slugs.map((s) => [s, assignments[s] ?? NO_GUESTS]));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
