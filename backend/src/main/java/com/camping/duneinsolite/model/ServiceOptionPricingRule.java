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
 * A date- or period-specific override of a {@link ServiceOption}'s
 * standard {@code unitPriceTtc} - the exact twin of {@link PricingRule}
 * (which does the same for {@link AccommodationType}), kept as its own
 * table rather than a polymorphic generalization of PricingRule: lower
 * risk to the already-shipped accommodation pricing path for the same
 * "same principle, not the same row" reasoning the codebase already
 * accepts for Tour/TourType/Extra.
 */
@Entity
@Table(name = "service_option_pricing_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceOptionPricingRule {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_option_id", nullable = false)
    private ServiceOption serviceOption;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false)
    private PricingRuleType ruleType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

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
}
