package com.camping.duneinsolite.model;

import com.camping.duneinsolite.money.Money;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "reservation_tour_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationTourType {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "reservation_tour_type_id", updatable = false, nullable = false)
    private UUID reservationTourTypeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    // ── Snapshots from TourType at booking time ──────────
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration")
    private String duration;
    @Column(name = "number_of_nights")
    private Integer numberOfNights;

    // Price snapshotted based on user role at booking time
    @Column(name = "adult_price", nullable = false)
    private java.math.BigDecimal adultPrice;

    @Column(name = "child_price", nullable = false)
    private java.math.BigDecimal childPrice;

    @Column(name = "number_of_adults", nullable = false)
    private Integer numberOfAdults;

    @Column(name = "number_of_children", nullable = false)
    private Integer numberOfChildren;

    @Column(name = "catalog_tour_type_id")
    private UUID catalogTourTypeId;

    @Column(name = "activity_date")
    private LocalDate activityDate;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

    // ── Accommodation snapshot (production-hardening Phase 1) ────────────
    // Set at booking time when the guest picked a tier (Desert Tent / Room /
    // Dune Suite). All nullable: a legacy or bivouac line leaves them null and
    // keeps the per-person pricing below. Snapshotted, so a later catalogue
    // price change never moves an existing reservation's total.
    @Column(name = "accommodation_type_id")
    private UUID accommodationTypeId;

    @Column(name = "accommodation_name")
    private String accommodationName;

    @Column(name = "accommodation_units")
    private Integer accommodationUnits;

    @Column(name = "accommodation_unit_price_ttc", precision = 15, scale = 3)
    private BigDecimal accommodationUnitPriceTtc;

    @Column(name = "accommodation_tva_rate", precision = 6, scale = 3)
    private BigDecimal accommodationTvaRate;

    /** True when this line is priced per accommodation unit, not per person. */
    @Transient
    public boolean isAccommodationPriced() {
        return accommodationUnitPriceTtc != null
                && accommodationUnits != null && accommodationUnits > 0;
    }

    // Computed — not stored. Prices are TTC, so no TVA multiplication.
    // Pure BigDecimal end to end (Phase 3).
    @Transient
    public BigDecimal getTotalPrice() {
        int nights = numberOfNights != null && numberOfNights > 0 ? numberOfNights : 1;
        if (isAccommodationPriced()) {
            return Money.lineTotal(accommodationUnitPriceTtc, accommodationUnits, nights);
        }
        BigDecimal perNight = Money.add(
                Money.multiply(adultPrice, numberOfAdults),
                Money.multiply(childPrice, numberOfChildren));
        return Money.multiply(perNight, nights);
    }
}