package com.camping.duneinsolite.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.sql.SQLException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A rejected write used to answer "other records still depend on it" whatever the
 * cause, so a duplicate slug or an empty required column sent editors hunting for
 * dependants that did not exist. The SQLSTATE now picks the message.
 */
class GlobalExceptionHandlerConstraintTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private ResponseEntity<Map<String, Object>> handle(String message, String sqlState) {
        return handler.handleDataIntegrityViolation(
                new DataIntegrityViolationException("could not execute statement", new SQLException(message, sqlState)));
    }

    @Test
    void duplicateValue_isAConflictNamingTheColumnButNotTheValue() {
        ResponseEntity<Map<String, Object>> res = handle(
                "ERROR: duplicate key value violates unique constraint \"uk_tours_slug\"\n  Detail: Key (slug)=(nom-de-circuit-1) already exists.",
                "23505");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(res.getBody().get("message")).isEqualTo("Another record already uses the same value for: slug.");
        assertThat(res.getBody().toString()).doesNotContain("nom-de-circuit-1").doesNotContain("uk_tours_slug");
    }

    @Test
    void missingRequiredValue_isABadRequestNamingTheColumn() {
        ResponseEntity<Map<String, Object>> res = handle(
                "ERROR: null value in column \"passenger_infant_price\" of relation \"tours\" violates not-null constraint", "23502");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(res.getBody().get("message")).isEqualTo("A required value is missing: passenger_infant_price.");
    }

    @Test
    void foreignKey_keepsTheDependencyWording() {
        ResponseEntity<Map<String, Object>> res = handle(
                "ERROR: update or delete on table \"users\" violates foreign key constraint \"fk_x\"", "23503");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(res.getBody().get("message")).isEqualTo("This action can't be completed because other records still depend on it.");
    }
}
