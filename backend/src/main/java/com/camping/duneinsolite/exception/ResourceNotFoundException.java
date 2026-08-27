package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A requested public resource (by slug or id) does not exist or is not
 * active. New code should throw this rather than a bare RuntimeException -
 * see BusinessException for why.
 */
public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
