package com.camping.duneinsolite.model.enums;

/**
 * <pre>
 *   PENDING  first delivery in flight, or a prior attempt FAILED and is being retried
 *   SENT     the email left the SMTP server successfully - terminal, idempotency anchor
 *   FAILED   the last attempt threw; the RabbitMQ message is being retried / has
 *            been dead-lettered. A DLQ replay moves it back through PENDING -> SENT.
 * </pre>
 */
public enum EmailDispatchStatus {
    PENDING,
    SENT,
    FAILED
}
