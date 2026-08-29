package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for errors that are part of the API's contract — a caller did
 * something the domain does not allow, and the message is safe to show them.
 *
 * <p>Why this exists: {@code GlobalExceptionHandler} used to map every
 * {@link RuntimeException} to {@code 400 Bad Request} and echo
 * {@code ex.getMessage()} into the response body. Two things went wrong with
 * that. A failed login returned 400 rather than 401, so clients could not tell
 * bad credentials from a malformed request. And a genuine defect — a null
 * dereference, a dead database connection, an unreachable Keycloak — also
 * surfaced as "400" carrying an internal message, which is both misleading and
 * an information leak.
 *
 * <p>The distinction this type draws:
 *
 * <ul>
 *   <li><b>A BusinessException is expected.</b> It carries its own status and
 *       its message is written for the caller.</li>
 *   <li><b>Anything else is a defect.</b> It falls through to the catch-all
 *       handler, which logs the full stack trace server-side and returns a
 *       generic 500 that reveals nothing.</li>
 * </ul>
 *
 * <p>Migration was deliberately incremental, and every bare
 * {@code throw new RuntimeException(...)} site in the service layer has now
 * been reclassified into one of this type's subclasses (mostly
 * {@link ResourceNotFoundException}, {@link ConflictException} and
 * {@link ReservationValidationException}, alongside the domain-specific ones
 * that already existed). The blanket {@code RuntimeException} handler in
 * {@code GlobalExceptionHandler} still can't be deleted, though: a handful of
 * {@code IllegalArgumentException}/{@code IllegalStateException} sites
 * (remise-exceeds-price checks in {@code KeycloakUserSyncService}, staff/
 * status guards in {@code ReservationServiceImpl}) are a related but distinct
 * category the original "~37 RuntimeException sites" count never covered,
 * and still rely on it for their current — reasonable, if unlabeled — status
 * codes. Migrating those is the next piece of this, not done yet. Spring
 * dispatches to the most specific handler, so subclasses of this type get
 * the right status the moment they are thrown — no big-bang change, and no
 * window where errors regress to 500.
 *
 * <p>When adding a new failure mode, subclass this rather than throwing a bare
 * {@code RuntimeException}.
 */
public abstract class BusinessException extends RuntimeException {

    private final HttpStatus status;

    protected BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    protected BusinessException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    /** The HTTP status this failure should be reported as. */
    public HttpStatus getStatus() {
        return status;
    }
}
