package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** This TourType already has a block for this date. */
public class AvailabilityBlockConflictException extends BusinessException {
    public AvailabilityBlockConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
