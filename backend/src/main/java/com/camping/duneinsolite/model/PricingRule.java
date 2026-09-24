package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.PricingRuleType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A date- or period-specific override of an {@link AccommodationType}'s or
 * an {@link Extra}'s standard price — the "15/10/2026 → 300 TND" and
 * "01/10 → 31/10 → 230 TND" cases from the pricing brief. Exactly one of
 * {@code accommodationType}/{@code extra} is set per row (never both,
 * never neither) — resolved in {@code AccommodationPricingService} /
 * {@code ExtraPricingService}: a DATE rule covering the requested date
 * wins over a PERIOD rule, which wins over the resource's standard price.
 *
 * <p>{@code startDate}/{@code endDate} are both inclusive; a DATE rule sets
 * both to the same day rather than being a separate single-day shape, so
 * one repository query (overlap on a range) serves both rule types.
 */
@Entity
@Table(name = "accommodation_pricing_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingRule {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accommodation_type_id")
    private AccommodationType accommodationType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "extra_id")
    private Extra extra;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false)
    private PricingRuleType ruleType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** TTC adult price per person per night for the rule's dates; child and infant scale by the same ratio. */
    @Column(name = "price_ttc", nullable = false, precision = 15, scale = 3)
    private BigDecimal priceTtc;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

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

    /** Whether this rule covers the given date — both bounds inclusive. */
    @Transient
    public boolean covers(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }
}
