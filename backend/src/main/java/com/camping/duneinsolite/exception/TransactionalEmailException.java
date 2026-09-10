package com.camping.duneinsolite.exception;

/**
 * A transactional email (queue-driven, retried, dead-lettered) failed to send.
 *
 * <p>Deliberately <b>not</b> a {@link BusinessException} and never reaches a
 * controller: it is thrown on a RabbitMQ listener thread so the container's
 * retry interceptor engages and, once retries are exhausted, the message is
 * dead-lettered to {@code notification.dlq}. Contrast {@link EmailDeliveryException},
 * which is the synchronous contact-form failure surfaced to an HTTP caller as 502.
 */
public class TransactionalEmailException extends RuntimeException {
    public TransactionalEmailException(String message, Throwable cause) {
        super(message, cause);
    }
}
