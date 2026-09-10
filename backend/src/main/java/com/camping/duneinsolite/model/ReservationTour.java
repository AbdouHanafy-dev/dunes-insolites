package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reservation_tours")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationTour {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "reservation_tour_id", updatable = false, nullable = false)
    private UUID reservationTourId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    // ── Snapshots from Tour catalog at booking time ──────────────
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration")
    private String duration;

    // Price snapshotted by role at booking time
    @Column(name = "adult_price", nullable = false)
    private java.math.BigDecimal adultPrice;

    @Column(name = "child_price", nullable = false)
    private java.math.BigDecimal childPrice;

    @Column(name = "number_of_adults", nullable = false)
    private Integer numberOfAdults;

    @Column(name = "number_of_children", nullable = false)
    private Integer numberOfChildren;

    @Column(name = "catalog_tour_id")
    private UUID catalogTourId;

    @Column(name = "departure_date", nullable = false)
    private LocalDate departureDate;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

    // Computed and stored — TTC price (HT + TVA), no nights multiplier
    @Column(name = "total_price", nullable = false)
    private java.math.BigDecimal totalPrice;

    @OneToMany(mappedBy = "reservationTour", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReservationTourHebergement> hebergements = new ArrayList<>();

    public void addHebergement(ReservationTourHebergement h) {
        hebergements.add(h);
        h.setReservationTour(this);
    }
}