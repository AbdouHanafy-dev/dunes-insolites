import { DEPARTURE_CITIES, type DepartureCity } from "@/lib/types";

/**
 * The cities a product offers, as ticked in the backoffice. `undefined` means an older
 * API that does not send the lists yet: offer everything, as before.
 * Departure is never empty server-side; return may be, which hides that step.
 */
export function departureOptions(list: readonly DepartureCity[] | undefined): readonly DepartureCity[] {
  return list && list.length > 0 ? list : DEPARTURE_CITIES;
}

export function returnOptions(list: readonly DepartureCity[] | undefined): readonly DepartureCity[] {
  return list ?? DEPARTURE_CITIES;
}
