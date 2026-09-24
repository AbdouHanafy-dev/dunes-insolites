package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A site photo slot key or address was not acceptable. */
public class InvalidSiteImageException extends BusinessException {
    public InvalidSiteImageException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
