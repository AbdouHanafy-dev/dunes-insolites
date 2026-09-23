package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One accommodation tier snapshot, attached to either a Stay's
 * {@link ReservationTourType} line or a circuit's
 * {@link ReservationTourHebergement} night — exactly one of the two FKs is
 * set, same dual-FK convention {@link ReservationRepartition} already uses
 * for the same reason (one shared line-item shape, two possible parents).
 * A guest may book several tiers at once (e.g. 2 Suites + 3 Tentes
 * together) — this is what makes that possible, one row per tier. Values
 * are copied at booking time, so a later catalogue price change never moves
 * an existing reservation's total.
 */
@Entity
@Table(name = "reservation_accommodations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationAccommodation {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_tour_type_id", nullable = true)
    private ReservationTourType reservationTourType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_tour_hebergement_id", nullable = true)
    private ReservationTourHebergement reservationTourHebergement;

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
}
