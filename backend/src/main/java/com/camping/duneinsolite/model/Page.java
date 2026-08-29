package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageCategory;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.model.enums.PageStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A page on one of the two public vitrines — content, SEO and publication
 * status all live on the same record (CLAUDE.md's "Content management" /
 * "SEO management" sections). Brand-scoped from the start: every Page
 * belongs to exactly one CompanyType, same as the rest of the company-aware
 * backoffice (docs/adr/0001-travel-order-and-settlement.md Stage 3).
 */
@Entity
@Table(name = "pages", uniqueConstraints = @UniqueConstraint(columnNames = { "slug", "locale", "company_type" }))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Page {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "page_id", updatable = false, nullable = false)
    private UUID pageId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false)
    private PageLocale locale;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PageStatus status = PageStatus.DRAFT;

    // Null = an ordinary static page (about/safety/contact, each wired to
    // one specific frontend route by slug). GUIDE lets the vitrine's
    // /guides index discover this page by category instead of a
    // developer hardcoding every new article's slug into the frontend.
    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private PageCategory category;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    // ── SEO ──────────────────────────────────────────────────────────
    @Column(name = "seo_title")
    private String seoTitle;

    @Column(name = "meta_description", columnDefinition = "TEXT")
    private String metaDescription;

    @Column(name = "focus_keyword")
    private String focusKeyword;

    @Column(name = "canonical_url")
    private String canonicalUrl;

    @Column(name = "no_index", nullable = false)
    @Builder.Default
    private Boolean noIndex = false;

    @Column(name = "no_follow", nullable = false)
    @Builder.Default
    private Boolean noFollow = false;

    @Column(name = "og_title")
    private String ogTitle;

    @Column(name = "og_description", columnDefinition = "TEXT")
    private String ogDescription;

    @Column(name = "og_image_url")
    private String ogImageUrl;

    // ── Content — ordered blocks (Payload-style page builder) ─────────
    @ElementCollection
    @CollectionTable(name = "page_blocks", joinColumns = @JoinColumn(name = "page_id"))
    @OrderColumn(name = "display_order")
    @Builder.Default
    private List<PageBlock> blocks = new ArrayList<>();

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
