package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * The requested activity units (quads, camel-ride seats...) are not
 * available for the requested date - either the activity is sold out for
 * that day, it has been deactivated, or another booking took the last unit
 * between the customer seeing availability and submitting.
 *
 * <p>409 Conflict: the request was valid, the world changed under it. The
 * message is safe to show the guest ("Quad is fully booked for that date").
 */
public class ActivityUnavailableException extends BusinessException {
    public ActivityUnavailableException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
