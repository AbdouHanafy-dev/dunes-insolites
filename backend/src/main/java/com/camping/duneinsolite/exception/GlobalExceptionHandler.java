package com.camping.duneinsolite.exception;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── Handle @Valid validation errors on @RequestBody ───────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "Validation failed — please check the fields below",
                fieldErrors
        );
    }

    // ── Handle @Valid on path/query params ────────────────────────────
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(
            ConstraintViolationException ex) {

        Map<String, String> fieldErrors = ex.getConstraintViolations().stream()
                .collect(Collectors.toMap(
                        v -> v.getPropertyPath().toString(),
                        ConstraintViolation::getMessage
                ));

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                fieldErrors
        );
    }

    // ── Contract errors: the caller did something the domain disallows ──
    // Each BusinessException carries its own status, so a failed login is 401,
    // a missing record is 404 and an upstream outage is 503 - rather than
    // everything collapsing to 400. Spring dispatches to the most specific
    // handler, so this wins over handleRuntimeException below.
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessException ex) {
        // Logged at WARN, not ERROR: these are expected outcomes, not defects.
        log.warn("Business rule rejected the request [{}]: {}",
                ex.getClass().getSimpleName(), ex.getMessage());

        return buildResponse(ex.getStatus(), ex.getMessage(), null);
    }

    // ── Handle bad caller-supplied values ──────────────────────────────
    //
    // Unlike the deprecated blanket handler this replaces, this one is
    // permanent: IllegalArgumentException's meaning ("the caller passed a
    // value the domain rejects") is universally 400-appropriate, unlike
    // IllegalStateException, whose meaning is context-dependent (a
    // reservation-status conflict is a 422 business rule; a malformed
    // token from the identity provider is a genuine defect that must stay
    // a 500 - see AuthService's own two throw sites, now correctly
    // falling through to handleGenericException below instead of landing
    // here). The five remaining IllegalArgumentException throw sites
    // (KeycloakUserSyncService's remise-exceeds-catalog-price checks)
    // have messages written for the caller already, same standard as
    // every BusinessException subclass.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Rejected caller-supplied value: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    // ── Handle a delete/update blocked by a real foreign-key reference ──
    //
    // Found live (relational-integrity audit): every one of this schema's
    // 51 foreign keys is NO ACTION - nothing cascades at the DB level -
    // and not every delete path checks its dependents first (deleteUser
    // didn't; see its own comment for the real, reproduced consequence).
    // Without this handler, a rejected delete surfaced as a raw 500
    // carrying Hibernate/Postgres's own SQL and constraint-name text - a
    // real information leak, and not even the right status. 409 is
    // correct: the request is well-formed, the server just can't do it
    // while other rows still point at this one. The real constraint name
    // is logged server-side, never in the response.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Blocked by a foreign-key/uniqueness constraint: {}", ex.getMostSpecificCause().getMessage());
        return constraintResponse(sqlCause(ex), ex.getMostSpecificCause().getMessage());
    }

    // One message for every kind of constraint made an editor guess (a duplicate
    // slug read "other records still depend on it"). The SQLSTATE says which it is:
    // 23505 unique, 23502 not-null, anything else (23503 foreign key) keeps the
    // dependency wording. Only the COLUMN name is repeated back, never the value
    // or the constraint name.
    private ResponseEntity<Map<String, Object>> constraintResponse(java.sql.SQLException sql, String detail) {
        String state = sql != null ? sql.getSQLState() : null;
        if ("23505".equals(state)) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("Key \\(([^)]+)\\)=").matcher(detail == null ? "" : detail);
            String column = m.find() ? m.group(1) : null;
            return buildResponse(HttpStatus.CONFLICT,
                    column != null
                            ? "Another record already uses the same value for: " + column + "."
                            : "Another record already uses the same value.",
                    null);
        }
        if ("23502".equals(state)) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("null value in column \"([^\"]+)\"").matcher(detail == null ? "" : detail);
            return buildResponse(HttpStatus.BAD_REQUEST,
                    m.find() ? "A required value is missing: " + m.group(1) + "." : "A required value is missing.",
                    null);
        }
        return buildResponse(
                HttpStatus.CONFLICT,
                "This action can't be completed because other records still depend on it.",
                null
        );
    }

    private static java.sql.SQLException sqlCause(Throwable t) {
        for (Throwable cur = t; cur != null; cur = cur.getCause() == cur ? null : cur.getCause()) {
            if (cur instanceof java.sql.SQLException sql) return sql;
        }
        return null;
    }

    // A direct EntityManager.flush() call (KeycloakUserSyncService.
    // deleteUser, deliberately not going through the repository proxy -
    // see its own comment on why the flush has to happen exactly there)
    // bypasses Spring's exception-translation aspect, which only wraps
    // calls made through a Spring Data repository or @Repository bean.
    // The raw Hibernate exception - a different class hierarchy from
    // Spring's DataIntegrityViolationException entirely, confirmed live
    // (the handler above did not catch it) - reaches here untranslated.
    // Found on the very first attempt to verify the fix above actually
    // works, not assumed.
    @ExceptionHandler(org.hibernate.exception.ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleHibernateConstraintViolation(
            org.hibernate.exception.ConstraintViolationException ex) {
        log.warn("Blocked by a foreign-key/uniqueness constraint: {}", ex.getMessage());
        return constraintResponse(ex.getSQLException(), ex.getSQLException() != null ? ex.getSQLException().getMessage() : ex.getMessage());
    }

    // ── Handle 404 not found ──────────────────────────────────────────
    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(
            jakarta.persistence.EntityNotFoundException ex) {

        return buildResponse(
                HttpStatus.NOT_FOUND,
                ex.getMessage(),
                null
        );
    }

    // ── Handle missing static resources (e.g. /media/{deleted-or-unknown-file}) ──
    // Spring throws this for any unmatched static-resource request and resolves
    // it to 404 by default - but RestControllerAdvice's own catch-all Exception
    // handler below runs first without this, turning a normal "file not found"
    // into a misleading 500. Media Library (MediaController/WebConfig) is what
    // first exercises this path: a stale/copied URL for a deleted upload must
    // 404, not read as a server defect.
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {

        return buildResponse(HttpStatus.NOT_FOUND, "Resource not found", null);
    }

    // ── Malformed request from the client → 4xx, not 5xx ──────────────
    // A bad/absent Content-Type or an unparseable body is the caller's fault.
    // Returning 500 here was noise (and a weak info signal); security
    // assessment 2026-09-10 (L-14).
    @ExceptionHandler({
            org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.HttpMediaTypeNotSupportedException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<Map<String, Object>> handleBadRequest(Exception ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Malformed or unsupported request.", null);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotAllowed(Exception ex) {
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed.", null);
    }

    // ── Handle any other unexpected error ─────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {

        log.error("Unhandled exception [{}]: {}", ex.getClass().getName(), ex.getMessage(), ex);
        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again later.",
                null
        );
    }

    // ── Helper to build consistent error response ─────────────────────
    private ResponseEntity<Map<String, Object>> buildResponse(
            HttpStatus status, String message, Map<String, String> errors) {

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        if (errors != null && !errors.isEmpty()) {
            body.put("errors", errors);
        }

        return ResponseEntity.status(status).body(body);
    }

    // ── Handle reservation status business rules ──────────────────────
    @ExceptionHandler(ReservationStatusException.class)
    public ResponseEntity<Map<String, Object>> handleReservationStatusException(
            ReservationStatusException ex) {

        return buildResponse(
                HttpStatus.UNPROCESSABLE_ENTITY,  // 422 — more semantic than 400
                ex.getMessage(),
                null
        );
    }

    // ── Handle access denied (wrong role action) ──────────────────────
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex) {

        return buildResponse(
                HttpStatus.FORBIDDEN,   // 403
                ex.getMessage(),
                null
        );
    }

    // ── Handle user not found ─────────────────────────────────────────────
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(UserNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), null);
    }

    // ── Handle duplicate email ────────────────────────────────────────────
    @ExceptionHandler(EmailAlreadyInUseException.class)
    public ResponseEntity<Map<String, Object>> handleEmailConflict(EmailAlreadyInUseException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), null); // 409
    }

    // ── Handle Keycloak sync failures ────────────────────────────────────
    @ExceptionHandler(KeycloakSyncException.class)
    public ResponseEntity<Map<String, Object>> handleKeycloakSync(KeycloakSyncException ex) {
        return buildResponse(
                HttpStatus.BAD_GATEWAY,   // 502 — external service failed
                "Identity provider sync failed: " + ex.getMessage(),
                null
        );
    }

    // ── Handle contact-form email delivery failures ───────────────────────
    // Real SMTP failure (auth, network) - see application-local.yml's own
    // empty mail password for a live example of this actually firing
    // locally. Logged with the cause server-side; the caller only ever sees
    // a generic message, never SMTP internals.
    @ExceptionHandler(EmailDeliveryException.class)
    public ResponseEntity<Map<String, Object>> handleEmailDelivery(EmailDeliveryException ex) {
        log.error("Email delivery failed: {}", ex.getMessage(), ex.getCause());
        return buildResponse(
                HttpStatus.BAD_GATEWAY,   // 502 — external service failed
                "Your message could not be sent right now. Please try again or contact us on WhatsApp.",
                null
        );
    }
    // ── Handle repartition validation errors ──────────────────────────
    @ExceptionHandler(RepartitionValidationException.class)
    public ResponseEntity<Map<String, Object>> handleRepartitionValidation(
            RepartitionValidationException ex) {

        return buildResponse(
                HttpStatus.UNPROCESSABLE_ENTITY,  // 422 — same as reservation status errors
                ex.getMessage(),
                null
        );
    }

    // ── Handle camping capacity violations ─────────────────────────────
    @ExceptionHandler(CapacityExceededException.class)
    public ResponseEntity<Map<String, Object>> handleCapacityExceeded(
            CapacityExceededException ex) {

        return buildResponse(
                HttpStatus.UNPROCESSABLE_ENTITY,  // 422 — same as reservation status errors
                ex.getMessage(),
                null
        );
    }

    // Note: ConflictException and ReservationValidationException are
    // BusinessException subclasses (see their own class comments), so
    // handleBusinessException above already reports them at the right
    // status - 409 and 422 respectively - with no dedicated handler
    // needed here. Listed for the same reason RepartitionValidationException
    // (a plain RuntimeException, needs its own handler) is visible above:
    // finding where a given exception's status comes from should never
    // require guessing.
}
