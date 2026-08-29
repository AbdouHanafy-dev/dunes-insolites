package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A maintenance window for this path already exists. */
public class MaintenanceConflictException extends BusinessException {
    public MaintenanceConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
