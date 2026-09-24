package com.camping.duneinsolite.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A site where guests leave reviews (Google, TripAdvisor, or one support
 * adds later). Each platform has its own colour, used wherever its reviews
 * are shown. {@code sourceKey} is the machine key the public wire type uses
 * for the well-known platforms; it is null for platforms added by staff,
 * which the public API reports as "other".
 */
@Entity
@Table(name = "review_platforms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReviewPlatform {

    /** Neutral grey used when a new platform is added without a colour. */
    public static final String DEFAULT_COLOR = "#6B7280";

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "platform_id", updatable = false, nullable = false)
    private UUID platformId;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    // "#RRGGBB" — enforced by a CHECK constraint and by the request DTOs.
    @Column(name = "color", nullable = false, length = 7)
    private String color;

    @Column(name = "source_key", length = 30)
    private String sourceKey;

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
