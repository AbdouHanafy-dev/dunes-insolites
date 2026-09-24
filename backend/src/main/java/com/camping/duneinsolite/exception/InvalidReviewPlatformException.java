package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A review was submitted without a usable platform (none chosen, or a new one without a name). */
public class InvalidReviewPlatformException extends BusinessException {
    public InvalidReviewPlatformException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
