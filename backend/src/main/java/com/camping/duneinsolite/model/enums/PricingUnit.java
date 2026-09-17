package com.camping.duneinsolite.model.enums;

/**
 * How a {@link com.camping.duneinsolite.model.ServiceOption}'s price
 * multiplies into a line total in {@code ServiceOptionPricingService}.
 */
public enum PricingUnit {
    /** unitPrice × number of days of the stay. */
    PER_DAY,
    /** unitPrice, once, regardless of quantity. */
    PER_BOOKING,
    /** unitPrice × number of participants. */
    PER_PERSON,
    /** unitPrice × number of vehicles requested. */
    PER_VEHICLE
}
