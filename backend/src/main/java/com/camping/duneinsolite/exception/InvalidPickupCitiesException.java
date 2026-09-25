package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A product's departure/return city selection, or a booking's city choice, breaks the rules. */
public class InvalidPickupCitiesException extends BusinessException {
    public InvalidPickupCitiesException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
