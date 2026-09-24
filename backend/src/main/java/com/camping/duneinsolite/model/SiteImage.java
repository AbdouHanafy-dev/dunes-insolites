package com.camping.duneinsolite.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A photo slot support has replaced. The key names the slot (for example
 * "home.hero" or "about.story" — the list lives in packages/api-types);
 * a slot with no row keeps the site's built-in photo.
 */
@Entity
@Table(name = "site_images")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SiteImage {

    @Id
    @Column(name = "image_key", length = 80, updatable = false, nullable = false)
    private String imageKey;

    @Column(name = "image_url", nullable = false, length = 512)
    private String imageUrl;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
