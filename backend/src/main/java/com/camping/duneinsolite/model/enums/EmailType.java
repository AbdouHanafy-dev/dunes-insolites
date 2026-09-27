package com.camping.duneinsolite.model.enums;

/**
 * The transactional emails whose delivery is tracked for idempotency and
 * recovery (see {@code EmailDispatch}). Only the queue-driven confirmation
 * email is tracked today; account emails (verify / reset) are request-scoped
 * and best-effort by design.
 */
public enum EmailType {
    RESERVATION_RECEIVED,
    /** The "you have received a booking" email to the team, sent once per site booking. */
    STAFF_NEW_BOOKING,
    /** Tells the team a site booking was confirmed - same recipients as {@link #STAFF_NEW_BOOKING}. */
    STAFF_RESERVATION_CONFIRMED,
    /** Tells the team a site booking was cancelled - same recipients as {@link #STAFF_NEW_BOOKING}. */
    STAFF_RESERVATION_CANCELLED
}
