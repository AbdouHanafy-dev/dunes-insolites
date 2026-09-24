package com.camping.duneinsolite.model;

import com.camping.duneinsolite.money.Money;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reservation_tour_hebergements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationTourHebergement {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "hebergement_id", updatable = false, nullable = false)
    private UUID hebergementId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_tour_id", nullable = false)
    private ReservationTour reservationTour;

    // ── Snapshots from TourType at booking time (free/included — no pricing) ──────
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration")
    private String duration;

    @Column(name = "number_of_nights")
    private Integer numberOfNights;

    @Column(name = "number_of_adults", nullable = false)
    private Integer numberOfAdults;

    @Column(name = "number_of_children", nullable = false)
    private Integer numberOfChildren;

    @Column(name = "number_of_infants", nullable = false)
    @Builder.Default
    private Integer numberOfInfants = 0;

    @Column(name = "catalog_tour_type_id")
    private UUID catalogTourTypeId;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    // ── Accommodation (Tour circuits that overnight at the Sabria camp) ──
    // A circuit whose Tour.overnightsAtCamp is true lets the guest pick a
    // real, priced tier (Tente/Chambre/Suite) for this night — same
    // ReservationAccommodation snapshot the Stay flow uses, attached here
    // instead of to a ReservationTourType. Empty when the circuit doesn't
    // offer accommodation (the free/included nights this entity was
    // originally built for keep working unpriced).
    @OneToMany(mappedBy = "reservationTourHebergement", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReservationAccommodation> accommodations = new ArrayList<>();

    @Transient
    public boolean isAccommodationPriced() {
        return !accommodations.isEmpty();
    }

    /** Sum of every selected tier's line total for this one night. */
    @Transient
    public BigDecimal getAccommodationTotalPrice() {
        int nights = numberOfNights != null && numberOfNights > 0 ? numberOfNights : 1;
        return Money.sum(accommodations.stream()
                .map(a -> a.lineTotal(nights))
                .toList());
    }
}
