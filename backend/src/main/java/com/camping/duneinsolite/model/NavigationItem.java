package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.NavMenuType;
import com.camping.duneinsolite.model.enums.PageLocale;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One entry in the vitrine's top navigation — label and URL are real
 * per-locale text (not a translation key), same convention as Page.title,
 * so a non-technical editor can change the site's menu without a code
 * deploy. No draft/publish workflow (unlike Page): a nav item takes effect
 * immediately, same as CampingSettings — this is closer to configuration
 * than editorial content under review.
 */
@Entity
@Table(name = "navigation_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NavigationItem {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "nav_item_id", updatable = false, nullable = false)
    private UUID navItemId;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "url", nullable = false)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false)
    private PageLocale locale;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    // Which mega-menu (if any) this item opens — the dropdown's actual
    // content is always built from live catalogue data by the vitrine,
    // never stored here. See NavMenuType.
    @Enumerated(EnumType.STRING)
    @Column(name = "menu_type", nullable = false)
    @Builder.Default
    private NavMenuType menuType = NavMenuType.NONE;

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
