package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * Self-registration requires accepting the terms of service + privacy
 * policy - server-enforced, not just a frontend checkbox (see
 * RegisterRequest.acceptedTerms and CLAUDE.md's "never trust the client
 * for authority").
 */
public class TermsNotAcceptedException extends BusinessException {
    public TermsNotAcceptedException() {
        super(HttpStatus.BAD_REQUEST, "You must accept the terms of service and privacy policy to register.");
    }
}
