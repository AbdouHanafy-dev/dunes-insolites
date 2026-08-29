package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A reservation, booking-extra or payment request violates a business rule
 * that isn't a missing/malformed field (that's @Valid's job) but a rule that
 * only makes sense in context - a HEBERGEMENT reservation with no check-in
 * date, a party split across tents that doesn't add up to the party size, a
 * payment that would exceed what's left owing. 422, same as the existing
 * ReservationStatusException/RepartitionValidationException/
 * CapacityExceededException - the request was well-formed, the server just
 * can't act on it as given.
 */
public class ReservationValidationException extends BusinessException {
    public ReservationValidationException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
