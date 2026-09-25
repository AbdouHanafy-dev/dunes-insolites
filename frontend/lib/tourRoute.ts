import type { Tour } from "@/lib/types";

type Step = Tour["itinerary"][number];

/** Google Maps takes at most about ten stops in one route. */
const MAX_STOPS = 10;

const clean = (value: string | null | undefined) => (value ?? "").trim();

/**
 * The places an editor named on the circuit's steps, in order: the pickup on the first
 * step, an attraction on each step in between, the drop-off on the last one. Those are
 * the only places the back office collects, so they are what the map is drawn from.
 */
export function routeStops(steps: readonly Step[]): string[] {
  const stops: string[] = [];
  steps.forEach((step, index) => {
    const first = index === 0;
    const last = index === steps.length - 1;
    const candidates: string[] = [];
    if (first) candidates.push(clean(step.pickupPoint));
    if (!first && !last) candidates.push(clean(step.attraction));
    if (last) candidates.push(clean(step.dropoffPoint));
    for (const place of candidates) {
      if (place && stops[stops.length - 1] !== place) stops.push(place);
    }
  });
  return stops.slice(0, MAX_STOPS);
}

/**
 * The map next to the itinerary. Two or more named places draw the route through them;
 * a single place (or, failing that, the circuit's departure location) shows that spot.
 * `null` when the editor named nothing, so no empty map is shown.
 */
export function tourMap(
  steps: readonly Step[],
  location: string | null | undefined,
): { embed: string; open: string } | null {
  const stops = routeStops(steps);
  const enc = encodeURIComponent;
  if (stops.length >= 2) {
    const [from, ...via] = stops;
    const query = `saddr=${enc(from)}&daddr=${via.map(enc).join("+to:")}`;
    return {
      embed: `https://www.google.com/maps?${query}&output=embed`,
      open: `https://www.google.com/maps?${query}`,
    };
  }
  const place = stops[0] ?? clean(location);
  if (!place) return null;
  return {
    embed: `https://www.google.com/maps?q=${enc(place)}&output=embed`,
    open: `https://www.google.com/maps?q=${enc(place)}`,
  };
}
