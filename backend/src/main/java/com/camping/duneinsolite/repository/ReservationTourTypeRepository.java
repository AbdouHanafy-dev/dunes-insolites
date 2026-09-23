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
    @Query("""
            SELECT COALESCE(SUM(acc.accommodationUnits), 0)
            FROM ReservationTourType rtt
            JOIN rtt.reservation r
            JOIN rtt.accommodations acc
            WHERE acc.accommodationTypeId = :accommodationTypeId
              AND acc.accommodationUnits IS NOT NULL
              AND r.checkInDate < :checkOut
              AND r.checkOutDate > :checkIn
              AND (:excludeReservationId IS NULL OR r.reservationId <> :excludeReservationId)
              AND (
                    r.status IN (com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
                                 com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN)
                 OR (r.status = com.camping.duneinsolite.model.enums.ReservationStatus.PENDING
                     AND (r.holdExpiresAt IS NULL OR r.holdExpiresAt > :now))
              )
            """)
    long sumConsumingUnits(@Param("accommodationTypeId") UUID accommodationTypeId,
                           @Param("checkIn") LocalDate checkIn,
                           @Param("checkOut") LocalDate checkOut,
                           @Param("now") LocalDateTime now,
                           @Param("excludeReservationId") UUID excludeReservationId);
}