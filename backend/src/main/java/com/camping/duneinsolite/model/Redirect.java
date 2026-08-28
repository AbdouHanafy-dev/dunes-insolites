package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A 301/302 redirect an editor sets up when a page's slug changes (e.g. a
 * Page in the CMS is renamed). Deliberately distinct from the DI-022 legacy
 * WordPress slug rewrites in frontend/next.config.ts (LEGACY_STAY_SLUGS /
 * LEGACY_ACTIVITY_SLUGS) — those are invisible rewrites that keep an
 * existing ranking URL as the canonical one and never change, compiled into
 * the build. This is the opposite case: a *new* redirect for a URL that is
 * going away, going forward. No draft/publish workflow, same as
 * NavigationItem — a stale link should redirect the moment it's saved, not
 * wait on a review step.
 */
@Entity
@Table(name = "redirects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Redirect {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "redirect_id", updatable = false, nullable = false)
    private UUID redirectId;

    // The old path, exactly as a visitor's browser requests it (leading
    // slash, respecting frontend/next.config.ts's trailingSlash: true
    // convention) - e.g. "/old-page/". Unique: two redirects for the same
    // source path is always a mistake, never a valid state.
    @Column(name = "from_path", nullable = false, unique = true)
    private String fromPath;

    @Column(name = "to_path", nullable = false)
    private String toPath;

    @Column(name = "status_code", nullable = false)
    @Builder.Default
    private Integer statusCode = 301;

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
