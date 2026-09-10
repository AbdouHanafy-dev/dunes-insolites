package com.camping.duneinsolite.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 5 — production error responses must not leak internals (stack traces,
 * SQL, entity dumps, exception class names, PII embedded in a raw message).
 */
class GlobalExceptionHandlerLeakageTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void unhandledException_returnsAGenericMessageAndNothingElse() {
        ResponseEntity<Map<String, Object>> resp = handler.handleGenericException(
                new RuntimeException("NullPointer at com.camping.secret.Thing line 42; user=jane@example.com"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        Map<String, Object> body = resp.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("message")).isEqualTo("An unexpected error occurred. Please try again later.");
        assertThat(body).doesNotContainKeys("trace", "exception", "stackTrace", "cause");
        // the original throwable's text must not appear anywhere in the body
        assertThat(body.toString()).doesNotContain("jane@example.com").doesNotContain("com.camping");
    }

    @Test
    void dataIntegrityViolation_doesNotEchoTheSqlOrConstraintName() {
        ResponseEntity<Map<String, Object>> resp = handler.handleDataIntegrityViolation(
                new DataIntegrityViolationException(
                        "could not execute statement; constraint [uk_users_email]; " +
                        "duplicate key value violates unique constraint \"uk_users_email\" Detail: Key (email)=(jane@example.com)"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().toString())
                .doesNotContain("jane@example.com")
                .doesNotContain("uk_users_email")
                .doesNotContain("constraint");
    }
}
