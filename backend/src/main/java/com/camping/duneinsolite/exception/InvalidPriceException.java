package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A price-shaped field violates a business rule that isn't expressible as a
 * single-field @Valid constraint - e.g. a sale price that isn't actually
 * lower than the regular price it's meant to discount. Re-validated
 * server-side regardless of what the admin wizard's own client-side check
 * claims, same "never trust the client" shape as every other authority
 * decision in this codebase.
 */
public class InvalidPriceException extends BusinessException {
    public InvalidPriceException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
