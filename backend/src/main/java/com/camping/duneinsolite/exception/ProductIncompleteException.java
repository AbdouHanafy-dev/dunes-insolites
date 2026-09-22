package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Thrown when a Tour is submitted for review but fails the server-side
 * completeness check - re-validated independently of whatever the wizard's
 * own client-side checklist claims, same "never trust the client" shape as
 * every other authority decision in this codebase.
 */
public class ProductIncompleteException extends BusinessException {
    public ProductIncompleteException(List<String> missing) {
        super(HttpStatus.BAD_REQUEST, "Tour is not complete: " + String.join(", ", missing));
    }
}
