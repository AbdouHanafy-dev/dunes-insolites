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

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
