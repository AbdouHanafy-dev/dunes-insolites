package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A named, standalone content block — the same shape as one entry in a
 * Page's block list (type + dataJson, see PageBlock), but reusable across
 * many pages instead of duplicated inline in each one. A Page references
 * one via a "blockReference" PageBlock (dataJson: {"blockId": "..."}) —
 * resolved to the real block at read time, both for the public API
 * (PublicPageController) and for the admin's live preview
 * (LivePreviewPane resolves it before postMessage-ing to the iframe, so
 * the iframe itself never has to call the backend).
 *
 * No draft/publish workflow, same reasoning as NavigationItem: this is
 * closer to a reusable content fragment than an editorial page under
 * review.
 */
@Entity
@Table(name = "content_blocks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContentBlock {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "block_id", updatable = false, nullable = false)
    private UUID blockId;

    // Admin-facing name only — never shown on the vitrine. Lets an editor
    // tell "Summer promo banner" apart from "Winter promo banner" in a list.
    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "data_json", columnDefinition = "TEXT")
    private String dataJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false)
    private PageLocale locale;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType;

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
