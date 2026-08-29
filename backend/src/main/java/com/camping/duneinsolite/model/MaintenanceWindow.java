package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Takes one specific page down for maintenance without touching the rest of
 * the vitrine — the ask was explicitly "not all the site". `path` is matched
 * exactly against the incoming pathname by frontend/middleware.ts, same
 * convention as Redirect's fromPath (leading slash, respects the site's
 * trailingSlash: true). `endsAt` is optional: set it to drive a countdown on
 * the maintenance page, leave it null for "back soon" with no timer.
 */
@Entity
@Table(name = "maintenance_windows")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceWindow {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "maintenance_id", updatable = false, nullable = false)
    private UUID maintenanceId;

    // The path a visitor's browser requests, exactly - e.g.
    // "/nuitee-campement-desert/". Unique: two windows for the same path is
    // always a mistake, never a valid state.
    @Column(name = "path", nullable = false, unique = true)
    private String path;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // Shown on the maintenance page. Free text, not translated per-locale -
    // this is operational chrome for a short outage, not indexed content.
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    // Drives the countdown. Null = no timer, just "back soon".
    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
