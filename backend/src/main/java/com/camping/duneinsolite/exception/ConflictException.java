package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A generic "this would duplicate something that must be unique" failure -
 * a tour/tour-type name already taken, a review already left for a product.
 * Domain-specific conflicts that carry their own extra context (Redirect,
 * MaintenanceWindow, Page slug, AvailabilityBlock) keep their own dedicated
 * subclass; this one exists so the many single-field "X already exists"
 * checks across the service layer don't each need a one-off class for a
 * message string and nothing else.
 */
public class ConflictException extends BusinessException {
    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
