package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A selected accommodation cannot be priced or booked — it is inactive, or its
 * price is not configured, or the party does not fit. 422: the request is
 * well-formed, the domain just won't accept it.
 *
 * <p>The message is safe to show the guest ("Dune Suite pricing isn't
 * available online yet — please contact the camp to book it").
 */
public class AccommodationPricingException extends BusinessException {
    public AccommodationPricingException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
