package com.camping.duneinsolite.exception;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    // ── TRANSITIONAL: the old catch-all for bare RuntimeExceptions ──────
    //
    // Roughly 37 `throw new RuntimeException(...)` sites in the services still
    // rely on this mapping to 400. It stays until each is reclassified as a
    // BusinessException subclass with a correct status.
    //
    // It is not safe to simply delete: without it those sites would fall to the
    // 500 handler below, turning working business errors into server errors for
    // the Angular apps in production. Shrink it by migrating throw sites, then
    // remove it once nothing depends on it.
    //
    // Note the leak this still permits: ex.getMessage() on an unclassified
    // exception reaches the client. That is precisely why it is temporary.
    @Deprecated
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(
            RuntimeException ex) {

        log.warn("Unclassified RuntimeException mapped to 400 - should be a "
                + "BusinessException [{}]: {}", ex.getClass().getName(), ex.getMessage());

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ex.getMessage(),
                null
        );
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
}
