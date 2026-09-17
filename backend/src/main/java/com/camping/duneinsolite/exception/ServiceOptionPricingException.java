package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A selected guide/transport option cannot be priced or booked — it is
 * inactive, or its price is not configured. 422: the request is
 * well-formed, the domain just won't accept it. Twin of
 * {@link AccommodationPricingException}.
 */
public class ServiceOptionPricingException extends BusinessException {
    public ServiceOptionPricingException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
