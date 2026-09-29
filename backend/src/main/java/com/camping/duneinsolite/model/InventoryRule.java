package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.PricingRuleType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryRule {
    @Id @GeneratedValue @UuidGenerator
    @Column(updatable = false, nullable = false)
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
    @Column(name = "max_units", nullable = false)
    private Integer maxUnits;
    @Column(length = 500)
    private String note;
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist void createTimestamps() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = LocalDateTime.now(); }
}
