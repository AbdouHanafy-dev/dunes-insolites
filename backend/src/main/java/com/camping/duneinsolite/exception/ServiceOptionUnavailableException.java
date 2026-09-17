package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * The requested guide/transport option is not available - sold out for
 * that date, deactivated, or another booking took the last unit between
 * the customer seeing availability and submitting.
 */
public class ServiceOptionUnavailableException extends BusinessException {
    public ServiceOptionUnavailableException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
