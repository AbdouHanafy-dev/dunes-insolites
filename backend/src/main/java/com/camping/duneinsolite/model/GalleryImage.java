package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.CompanyType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One photo in the vitrine's gallery — the homepage strip (GalleryStrip)
 * and the /gallery page. Real editor content, replacing the hardcoded list
 * that used to live in frontend/lib/data/gallery.ts. No draft/publish
 * workflow, same as NavigationItem / Redirect: a change takes effect the
 * moment it's saved.
 *
 * `imageUrl` is whatever the media library hands back ("/media/xyz.jpg" or
 * an absolute URL) — the same value an editor pastes into a content block's
 * image field. The public shape maps this to `src` to match the existing
 * GalleryItem wire type.
 */
@Entity
@Table(name = "gallery_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GalleryImage {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "gallery_item_id", updatable = false, nullable = false)
    private UUID galleryItemId;

    @Column(name = "image_url", nullable = false, length = 512)
    private String imageUrl;

    // Human-readable description of the photo — used as the img alt attribute
    // and, on the homepage strip, as the visible caption underneath.
    @Column(name = "alt", nullable = false)
    private String alt;

    // The filter facet on the /gallery page ("Camel Trek", "The Gate", ...).
    // Free text so an editor can introduce a new facet without a code change.
    @Column(name = "tag", nullable = false, length = 120)
    private String tag;

    // Spans two rows in the mosaic — the existing GalleryItem.tall wire flag.
    @Column(name = "tall", nullable = false)
    @Builder.Default
    private boolean tall = false;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    @Builder.Default
    private CompanyType companyType = CompanyType.DUNES_INSOLITES;

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
