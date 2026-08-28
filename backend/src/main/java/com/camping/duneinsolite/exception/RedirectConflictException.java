package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A redirect for this from-path already exists, or it would redirect to itself. */
public class RedirectConflictException extends BusinessException {
    public RedirectConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
