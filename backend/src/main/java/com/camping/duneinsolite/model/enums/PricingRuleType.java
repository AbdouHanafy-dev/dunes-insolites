package com.camping.duneinsolite.model.enums;

/**
 * How a {@link com.camping.duneinsolite.model.PricingRule} matches a date.
 * Resolution priority is DATE, then PERIOD, then the accommodation's own
 * standard {@code unitPriceTtc} — see AccommodationPricingService. Season is
 * deliberately not a value yet (no admin UI or business definition of
 * seasons exists); PERIOD already covers "01/10 → 31/10" and this enum can
 * grow a SEASON value later without a data migration.
 */
public enum PricingRuleType {
    DATE,
    PERIOD
}
