package com.camping.duneinsolite.model.enums;

/**
 * The transactional emails whose delivery is tracked for idempotency and
 * recovery (see {@code EmailDispatch}). Only the queue-driven confirmation
 * email is tracked today; account emails (verify / reset) are request-scoped
 * and best-effort by design.
 */
public enum EmailType {
    RESERVATION_RECEIVED
}
