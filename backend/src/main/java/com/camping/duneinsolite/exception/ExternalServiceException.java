package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * A service this application depends on — Keycloak, SMTP, the currency rate
 * provider — was unreachable or failed.
 *
 * Reported as 503 so callers know the request may succeed if retried, which is
 * information a 400 or a 500 does not convey. The upstream cause is logged
 * server-side; the message given to the caller names the service but never
 * includes its response.
 */
public class ExternalServiceException extends BusinessException {
    public ExternalServiceException(String service, Throwable cause) {
        super(HttpStatus.SERVICE_UNAVAILABLE,
              service + " is temporarily unavailable. Please try again shortly.",
              cause);
    }
}
