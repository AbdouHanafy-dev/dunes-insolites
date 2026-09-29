package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationTourType;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationTourTypeRepository extends JpaRepository<ReservationTourType, UUID> {
    List<ReservationTourType> findByReservationReservationId(UUID reservationId);

    // Read-only, additive - built for the Disponibilités calendar
    // (AvailabilityServiceImpl). Joins to Reservation only to filter out
    // cancelled/rejected bookings from the occupancy count; Reservation's
    // own @SQLRestriction("deleted_at IS NULL") already excludes soft-deleted
    // rows from this join automatically. Does not touch, call, or depend on
    // anything in ReservationServiceImpl.
    @Query("""
            SELECT rtt FROM ReservationTourType rtt
            JOIN rtt.reservation r
            WHERE rtt.catalogTourTypeId = :tourTypeId
              AND rtt.activityDate BETWEEN :start AND :end
              AND r.status NOT IN :excludedStatuses
            """)
    List<ReservationTourType> findActiveByTourTypeAndDateRange(
            @Param("tourTypeId") UUID tourTypeId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("excludedStatuses") Collection<ReservationStatus> excludedStatuses);

    /**
     * Phase 2 — accommodation units currently CONSUMED for one tier over the
     * nights [checkIn, checkOut). Consuming = CONFIRMED / CHECKED_IN, or PENDING
     * whose hold has not expired ({@code hold_expires_at IS NULL OR > now}).
     * A soft-deleted reservation is excluded automatically by Reservation's
     * {@code @SQLRestriction}. Run this INSIDE the transaction that holds the
     * pessimistic lock on the accommodation_types row.
     *
     * <p>check-in inclusive, check-out exclusive: overlap is
     * {@code existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn}.
     */
    @Query(value = """
            SELECT COALESCE(SUM(ra.accommodation_units), 0)
            FROM reservation_accommodations ra
            LEFT JOIN reservation_tour_types rtt
                   ON rtt.reservation_tour_type_id = ra.reservation_tour_type_id
            LEFT JOIN reservation_tour_hebergements rth
                   ON rth.hebergement_id = ra.reservation_tour_hebergement_id
            LEFT JOIN reservation_tours rt
                   ON rt.reservation_tour_id = rth.reservation_tour_id
            JOIN reservations r
              ON r.reservation_id = COALESCE(rtt.reservation_id, rt.reservation_id)
            WHERE ra.accommodation_type_id = :accommodationTypeId
              AND ra.accommodation_units IS NOT NULL
              AND (
                    (rtt.reservation_tour_type_id IS NOT NULL
                     AND r.check_in_date <= :night AND r.check_out_date > :night)
                 OR (rth.hebergement_id IS NOT NULL
                     AND rth.activity_date <= :night
                     AND rth.activity_date + COALESCE(rth.number_of_nights, 1) > :night)
              )
              AND r.deleted_at IS NULL
              AND (:excludeReservationId IS NULL OR r.reservation_id <> :excludeReservationId)
              AND (
                    r.status IN ('CONFIRMED', 'CHECKED_IN')
                 OR (r.status = 'PENDING'
                     AND (r.hold_expires_at IS NULL OR r.hold_expires_at > :now))
              )
            """, nativeQuery = true)
    long sumConsumingUnitsOnNight(@Param("accommodationTypeId") UUID accommodationTypeId,
                                  @Param("night") LocalDate night,
                                  @Param("now") LocalDateTime now,
                                  @Param("excludeReservationId") UUID excludeReservationId);
}
