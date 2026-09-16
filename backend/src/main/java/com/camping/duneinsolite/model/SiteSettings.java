package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Single row (id always 1), same shape as CampingSettings — real business
// facts (contact info, social links, headline stats) the vitrine used to
// hardcode in frontend/lib/site.ts and lib/data/stats.ts, now editable
// from the admin without a code deploy. See V11__site_settings.sql.
@Entity
@Table(name = "site_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SiteSettings {

    @Id
    private Long id;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "whatsapp", nullable = false)
    private String whatsapp;

    @Column(name = "address", nullable = false)
    private String address;

    @Column(name = "latitude", nullable = false)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false)
    private BigDecimal longitude;

    @Column(name = "instagram_url")
    private String instagramUrl;

    @Column(name = "facebook_url")
    private String facebookUrl;

    @Column(name = "tiktok_url")
    private String tiktokUrl;

    // Presentational strings ("12k+", "8 yrs"), not numbers - see
    // migration's own comment.
    @Column(name = "guests_guided", nullable = false)
    private String guestsGuided;

    @Column(name = "years_running", nullable = false)
    private String yearsRunning;

    // The REAL Google rating (Places API), not this app's own internal
    // review average - on request, 15 Sep 2026: "the rate from Google,
    // don't invent one, that's fake". Null until a real placeId is set
    // and the first successful fetch happens; GooglePlacesService caches
    // the result here (googleRatingFetchedAt) rather than calling Google
    // on every single page view. See GooglePlacesProperties for the API
    // key this requires.
    @Column(name = "google_place_id")
    private String googlePlaceId;

    @Column(name = "google_rating")
    private BigDecimal googleRating;

    @Column(name = "google_rating_count")
    private Integer googleRatingCount;

    @Column(name = "google_rating_fetched_at")
    private LocalDateTime googleRatingFetchedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
