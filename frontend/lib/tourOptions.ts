import type { ServiceOptionCatalogItem } from "@/lib/api";

/** serviceType of the option that charges for a return city outside the list (see the back office). */
export const RETURN_CITY_OPTION_TYPE = "RETURN_CITY";

/**
 * The paid upgrades listed on a circuit (single tent, suite...): the active options of the catalogue
 * that are not the return-city one, on a circuit that crosses at least one night. They are ALL
 * shown; whether one can be picked depends on the party (see isUpgradeAvailable).
 */
export function upgradeOptions(options: readonly ServiceOptionCatalogItem[], nights: number): ServiceOptionCatalogItem[] {
  if (nights < 1) return [];
  return options.filter((o) => o.category === "TOUR_OPTION" && o.type !== RETURN_CITY_OPTION_TYPE);
}

/**
 * Can this party pick the option? Its minimum is set per option in the back office; a party below it
 * still sees the option, greyed out, with the reason. The server enforces the same minimum.
 */
export function isUpgradeAvailable(option: Pick<ServiceOptionCatalogItem, "minPartySize">, party: number): boolean {
  return (option.minPartySize ?? 0) <= party;
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
