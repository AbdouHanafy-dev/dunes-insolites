package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * The requested accommodation units are not available for the requested nights —
 * either the tier is sold out, or another booking took the last unit between the
 * customer seeing availability and submitting.
 *
 * <p>409 Conflict: the request was valid, the world changed under it. The
 * message is safe to show the guest ("Dune Suite just sold out for those
 * dates").
 */
public class AccommodationUnavailableException extends BusinessException {
    public AccommodationUnavailableException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
