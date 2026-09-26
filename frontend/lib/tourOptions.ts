import type { ServiceOptionCatalogItem } from "@/lib/api";

/** serviceType of the option that charges for a return city outside the list (see the back office). */
export const RETURN_CITY_OPTION_TYPE = "RETURN_CITY";

/**
 * The paid upgrades a guest can add to a circuit (single tent, suite...): the active options
 * of the catalogue that are not the return-city one, on a circuit that crosses at least one
 * night, for a party that reaches the option's minimum. The minimum is set per option in the
 * back office and the server enforces it too.
 */
export function visibleUpgrades(
  options: readonly ServiceOptionCatalogItem[],
  party: number,
  nights: number,
): ServiceOptionCatalogItem[] {
  if (nights < 1) return [];
  return options.filter(
    (o) => o.category === "TOUR_OPTION" && o.type !== RETURN_CITY_OPTION_TYPE && (o.minPartySize ?? 0) <= party,
  );
}

/** The option that prices a return city typed by the guest, if the back office set one up. */
export function returnCityOption(options: readonly ServiceOptionCatalogItem[]): ServiceOptionCatalogItem | undefined {
  return options.find((o) => o.category === "TOUR_OPTION" && o.type === RETURN_CITY_OPTION_TYPE);
}

/**
 * The estimate shown next to an option. The server recomputes the real amount; this only
 * follows the same unit: per person per night, per person, or once.
 */
export function optionTotal(option: Pick<ServiceOptionCatalogItem, "pricingUnit" | "priceTtc">, party: number, nights: number): number {
  const unit = option.priceTtc ?? 0;
  switch (option.pricingUnit) {
    case "PER_PERSON_NIGHT":
      return unit * party * Math.max(nights, 1);
    case "PER_PERSON":
      return unit * party;
    case "PER_DAY":
      return unit * Math.max(nights, 1);
    default:
      return unit;
  }
}
