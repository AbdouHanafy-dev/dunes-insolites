package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** An uploaded file was empty, missing, or otherwise unusable. */
public class InvalidUploadException extends BusinessException {
    public InvalidUploadException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
