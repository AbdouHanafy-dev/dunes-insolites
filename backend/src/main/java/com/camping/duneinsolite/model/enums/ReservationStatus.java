package com.camping.duneinsolite.model.enums;

public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    CHECKED_IN,
    CANCELLED,
    REJECTED,
    COMPLETED,
    /**
     * A public guest hold whose {@code holdExpiresAt} passed before it was
     * confirmed. Terminal, like CANCELLED/REJECTED — it no longer consumes
     * accommodation inventory. Set by {@code HoldExpiryJob}; the availability
     * calculation already treats a past-expiry PENDING hold as non-consuming,
     * so the job is housekeeping, not correctness.
     */
    EXPIRED
}
