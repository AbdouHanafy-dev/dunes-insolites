package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * One write made through the API and who made it. Append-only: nothing in the
 * application updates or deletes these rows. See V55__audit_log.sql.
 */
@Entity
@Table(name = "audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLogEntry {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    /** The JWT {@code sub} — our {@code User.userId}. */
    @Column(name = "actor_id", length = 64, updatable = false)
    private String actorId;

    @Column(name = "actor_email", updatable = false)
    private String actorEmail;

    @Column(name = "actor_name", updatable = false)
    private String actorName;

    /** Comma-separated, e.g. {@code ADMIN,CAMPING}. */
    @Column(name = "actor_roles", updatable = false)
    private String actorRoles;

    /** CREATE, UPDATE, DELETE, or ACTION (a verb such as approve or cancel). */
    @Column(name = "action", nullable = false, length = 20, updatable = false)
    private String action;

    /** The verb for an ACTION, e.g. {@code approve}. */
    @Column(name = "verb", length = 80, updatable = false)
    private String verb;

    @Column(name = "method", nullable = false, length = 8, updatable = false)
    private String method;

    @Column(name = "path", nullable = false, length = 500, updatable = false)
    private String path;

    @Column(name = "entity_type", length = 80, updatable = false)
    private String entityType;

    @Column(name = "entity_id", length = 64, updatable = false)
    private String entityId;

    /** The record's name before the change — what makes a deleted record identifiable. */
    @Column(name = "entity_label", updatable = false)
    private String entityLabel;

    @Column(name = "status_code", nullable = false, updatable = false)
    private Integer statusCode;

    @Column(name = "ip", length = 64, updatable = false)
    private String ip;

    @Column(name = "user_agent", length = 300, updatable = false)
    private String userAgent;

    @Column(name = "correlation_id", length = 64, updatable = false)
    private String correlationId;
}
