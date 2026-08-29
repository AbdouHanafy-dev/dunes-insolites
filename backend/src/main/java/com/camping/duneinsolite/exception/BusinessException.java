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
 * <p>Migration is now complete. Every bare {@code throw new
 * RuntimeException(...)} site in the service layer was reclassified into
 * one of this type's subclasses (mostly {@link ResourceNotFoundException},
 * {@link ConflictException} and {@link ReservationValidationException},
 * alongside the domain-specific ones that already existed); the related
 * {@code IllegalStateException} sites turned out to split into two
 * different meanings — a reservation-status conflict is a real business
 * rule (now {@link ReservationStatusException}, 422), while a malformed
 * token from the identity provider is a genuine defect that must stay a
 * 500 — and the remaining {@code IllegalArgumentException} sites (all
 * "caller supplied a value the domain rejects") got their own permanent
 * {@code GlobalExceptionHandler} mapping to 400, since that meaning is
 * always 400-appropriate, unlike {@code IllegalStateException}'s. The old
 * blanket {@code RuntimeException} → 400 handler this all used to lean on
 * has been deleted outright — nothing depends on it anymore, and its
 * removal is what makes a genuine defect correctly reach the generic 500
 * handler instead of being misreported as 400 with its message leaked.
 * Spring dispatches to the most specific handler, so subclasses of this
 * type get the right status the moment they are thrown.
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
