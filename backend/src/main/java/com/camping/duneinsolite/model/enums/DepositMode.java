package com.camping.duneinsolite.model.enums;

/** How much of a reservation's total is asked for before arrival. */
public enum DepositMode {
    /** Nothing upfront - everything is settled on arrival. */
    NONE,
    /** {@code PaymentPolicy.depositPercent} % of the total. */
    PERCENT,
    /** The whole total. */
    FULL
}
