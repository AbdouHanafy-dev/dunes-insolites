package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One guide/transport line on a reservation - the exact twin of
 * {@link ReservationExtra}: everything commercial is snapshotted at
 * booking time (name, price, pricing unit) so a later catalogue price
 * change never moves an existing reservation's total.
 */
@Entity
@Table(name = "reservation_service_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationServiceOption {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "reservation_service_option_id", updatable = false, nullable = false)
    private UUID reservationServiceOptionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @Column(name = "catalog_service_option_id")
    private UUID catalogServiceOptionId;

    // ── Snapshot from ServiceOption at booking time ──────────
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private ServiceOptionCategory category;

    @Column(name = "type", nullable = false)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_unit", nullable = false)
    private PricingUnit pricingUnit;

    /** Unit price at booking time — persisted, never re-read. */
    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    /** Days / persons / vehicles, depending on pricingUnit — always 1 for PER_BOOKING. */
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private BigDecimal tva = BigDecimal.ZERO;

    /** The date capacity was allocated against — the stay's check-in date, or serviceDate for a standalone booking. */
    @Column(name = "service_date")
    private LocalDate serviceDate;

    @Embedded
    private PickupDetails pickupDetails;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
