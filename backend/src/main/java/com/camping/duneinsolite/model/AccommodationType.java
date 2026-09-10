package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.Currency;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A bookable accommodation tier for a fixed-camp nuitée — Desert Tent / Desert
 * Room / Dune Suite. Belongs to one {@link TourType} (the nuitée). The
 * bivouac nuitée has none.
 *
 * <p>Pricing is <b>per unit, per night</b> (the inference documented in
 * docs/reports/phase1-accommodation-pricing.md — F-1). Prices are stored
 * <b>TTC</b> (tax-inclusive) with a {@code tvaRate}, matching the rest of the
 * platform.
 *
 * <p><b>{@code unitPriceTtc} is nullable and that means "price not configured".</b>
 * Such a tier is invisible on the vitrine and any booking that selects it is
 * rejected ({@code AccommodationPricingException}). Real prices are entered by
 * an admin once F-2 is answered — nothing here invents them.
 */
@Entity
@Table(name = "accommodation_types",
        uniqueConstraints = @UniqueConstraint(columnNames = {"tour_type_id", "slug"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AccommodationType {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_type_id", nullable = false)
    private TourType tourType;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    /** Max guests one unit sleeps — the hard capacity cap used when sizing a booking. */
    @Column(name = "capacity", nullable = false)
    private int capacity;

    /**
     * How many physical units of this tier exist (Phase 2 inventory ceiling).
     * <b>NULL = inventory not configured</b> → availability reports UNKNOWN and
     * no ceiling is enforced (same as pre-Phase-2). An admin sets the real
     * number; nothing here invents one. Distinct from {@link #capacity}
     * (guests-per-unit).
     */
    @Column(name = "max_units")
    private Integer maxUnits;

    /** TTC, per unit per night. NULL = not configured → not bookable. */
    @Column(name = "unit_price_ttc", precision = 15, scale = 3)
    private BigDecimal unitPriceTtc;

    @Column(name = "tva_rate", precision = 6, scale = 3)
    private BigDecimal tvaRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 3, nullable = false)
    @Builder.Default
    private Currency currency = Currency.TND;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @ElementCollection
    @CollectionTable(name = "accommodation_type_features",
            joinColumns = @JoinColumn(name = "accommodation_type_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "feature", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> features = new ArrayList<>();

    /** True when this tier has everything it needs to be booked. */
    @Transient
    public boolean isBookable() {
        return active && unitPriceTtc != null;
    }
}
