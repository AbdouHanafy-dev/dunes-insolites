package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import com.camping.duneinsolite.money.Money;

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

    // Who sleeps in this tier and the per-person, per-night price each guest type
    // paid at booking. NULL on rows made before per-person pricing: those are
    // still totalled units x unit price, so an old reservation never moves.
    @Column(name = "adults")
    private Integer adults;

    @Column(name = "children")
    private Integer children;

    @Column(name = "infants")
    private Integer infants;

    @Column(name = "adult_price_ttc", precision = 15, scale = 3)
    private BigDecimal adultPriceTtc;

    @Column(name = "child_price_ttc", precision = 15, scale = 3)
    private BigDecimal childPriceTtc;

    @Column(name = "infant_price_ttc", precision = 15, scale = 3)
    private BigDecimal infantPriceTtc;

    /** True for a row priced per person; false for a legacy per-unit row. */
    @Transient
    public boolean isPerPerson() {
        return adultPriceTtc != null;
    }

    /** TTC total of this tier for {@code nights} nights. */
    @Transient
    public BigDecimal lineTotal(int nights) {
        if (!isPerPerson()) {
            return Money.lineTotal(accommodationUnitPriceTtc, accommodationUnits, nights);
        }
        BigDecimal perNight = Money.add(
                Money.multiply(adultPriceTtc, adults == null ? 0 : adults),
                Money.multiply(childPriceTtc, children == null ? 0 : children),
                Money.multiply(infantPriceTtc, infants == null ? 0 : infants));
        return Money.multiply(perNight, Math.max(nights, 1));
    }
}
