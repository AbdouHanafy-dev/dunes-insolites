package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A verify-email or reset-password link that doesn't exist, already expired,
 * or was already used. Deliberately one generic message regardless of which
 * of those three it actually is — telling an attacker "this token expired"
 * vs. "this token doesn't exist" leaks whether a given string was ever a
 * real, issued token.
 */
public class InvalidTokenException extends BusinessException {
    public InvalidTokenException() {
        super(HttpStatus.BAD_REQUEST, "This link is invalid or has expired.");
    }
}
