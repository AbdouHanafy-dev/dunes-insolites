package com.camping.duneinsolite.model.enums;

/**
 * How an {@link com.camping.duneinsolite.model.Extra}'s price multiplies into
 * a reservation line total.
 */
public enum PricingUnit {
    /** Existing activity semantics: catalogue unit price × requested quantity. */
    PER_UNIT,
    /** unitPrice × number of days of the stay. */
    PER_DAY,
    /** unitPrice, once, regardless of quantity. */
    PER_BOOKING,
    /** unitPrice × number of participants. */
    PER_PERSON,
    /** unitPrice × number of vehicles requested. */
    PER_VEHICLE,
    /**
     * unitPrice × number of participants × number of nights. The caller supplies the nights as the
     * requested quantity (a circuit's nights are worked out from its duration, never typed by a guest).
     */
    PER_PERSON_NIGHT
}
