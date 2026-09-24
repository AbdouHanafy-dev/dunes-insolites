package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.model.enums.PricingUnit;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "reservation_extras")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationExtra {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "reservation_extra_id", updatable = false, nullable = false)
    private UUID reservationExtraId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @Column(name = "name", nullable = false)
    private String name;

    // Short description shown on the front-end
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // Duration — for timed extras like quad rides (e.g. "1h30", "2h")
    @Column(name = "duration")
    private String duration;

    @Column(name = "catalog_extra_id")
    private UUID catalogExtraId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ExtraCategory category = ExtraCategory.ACTIVITY;

    @Column(name = "service_type")
    private String serviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_unit", nullable = false)
    @Builder.Default
    private PricingUnit pricingUnit = PricingUnit.PER_UNIT;

    @Embedded
    private PickupDetails pickupDetails;

    @Column(name = "is_resource_allocation", nullable = false)
    @Builder.Default
    private boolean resourceAllocation = false;

    @Column(name = "selected_extra_id")
    private UUID selectedExtraId;

    // Minutes booked for a timed activity; null when it was not timed.
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    // Snapshot of the price at booking time
    @Column(name = "unit_price", nullable = false)
    private java.math.BigDecimal unitPrice;

    @Column(name = "total_price")
    private java.math.BigDecimal totalPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "activity_date")
    private LocalDate activityDate;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

}
