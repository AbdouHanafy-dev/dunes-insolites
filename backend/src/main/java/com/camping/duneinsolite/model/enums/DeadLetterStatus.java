package com.camping.duneinsolite.model.enums;

/**
 * <pre>
 *   UNRESOLVED  recorded from notification.dlq, awaiting an operator
 *   REPLAYED    an admin re-published it to its original exchange/routing key
 *   DISCARDED   an admin judged it unrecoverable / no longer relevant
 * </pre>
 */
public enum DeadLetterStatus {
    UNRESOLVED,
    REPLAYED,
    DISCARDED
}
