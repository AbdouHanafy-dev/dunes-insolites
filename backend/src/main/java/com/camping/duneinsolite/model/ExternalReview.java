package com.camping.duneinsolite.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A real review published by a guest on another platform (Google,
 * TripAdvisor, ...), copied in by hand. Never generated, translated or
 * reworded: {@code body} is exactly what the guest wrote, in their
 * language. {@code ownerReply} is the business's own public answer on that
 * platform, when there is one.
 */
@Entity
@Table(name = "external_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExternalReview {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "external_review_id", updatable = false, nullable = false)
    private UUID externalReviewId;

    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    @Column(name = "country", length = 80)
    private String country;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    // Eager on purpose: every read of a review also needs the platform's
    // name and colour, and there are only a handful of platforms.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "platform_id", nullable = false)
    private ReviewPlatform platform;

    @Column(name = "source_url", length = 512)
    private String sourceUrl;

    // Free text as the platform shows it, e.g. "Vacances · Amis".
    @Column(name = "trip_type", length = 120)
    private String tripType;

    @Column(name = "owner_reply", columnDefinition = "TEXT")
    private String ownerReply;

    @Column(name = "owner_reply_date")
    private LocalDate ownerReplyDate;

    @Column(name = "published", nullable = false)
    @Builder.Default
    private boolean published = true;

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
