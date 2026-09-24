package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A favourite's type or slug was not acceptable, or the customer's list is full. */
public class InvalidFavoriteException extends BusinessException {
    public InvalidFavoriteException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
