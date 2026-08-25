import type { Stats } from "@/lib/types";

/** Seed values — the experience band falls back to these if the API is down. */
export const stats: Stats = {
  guestsGuided: "12k+",
  avgRating: "4.9★",
  yearsRunning: "8 yrs",
};

export async function getStats(): Promise<Stats> {
  return stats;
}
