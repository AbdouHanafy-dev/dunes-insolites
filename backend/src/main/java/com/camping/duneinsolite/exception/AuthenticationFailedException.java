package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * The caller's credentials were rejected.
 *
 * Distinct from {@link ExternalServiceException}: this means Keycloak answered
 * and said no. If Keycloak could not be reached at all, that is a 503, not a
 * failed login — reporting an outage as "wrong password" sends the user to
 * reset a password that was never the problem.
 *
 * The message is deliberately vague. Confirming whether an email exists lets
 * an attacker enumerate accounts.
 */
public class AuthenticationFailedException extends BusinessException {
    public AuthenticationFailedException() {
        super(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }

    public AuthenticationFailedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
