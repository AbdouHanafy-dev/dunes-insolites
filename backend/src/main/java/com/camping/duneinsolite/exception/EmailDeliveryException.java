package com.camping.duneinsolite.exception;

// Thrown by EmailService's synchronous send methods (contact form) when the
// SMTP send itself fails. Deliberately NOT @Async like the other
// EmailService methods, and deliberately not swallowed: the whole point of
// fixing the vitrine's contact form (found silently discarding every
// message) is that a visitor's message either really reaches the inbox or
// they're told it failed - never both silently. Mapped to 502 by
// GlobalExceptionHandler, same status as KeycloakSyncException for the same
// reason: the request was fine, an external service (SMTP) is what failed.
public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
