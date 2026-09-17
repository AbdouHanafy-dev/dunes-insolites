package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationExtra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationExtraRepository extends JpaRepository<ReservationExtra, UUID> {
    List<ReservationExtra> findByReservationReservationId(UUID reservationId);
    List<ReservationExtra> findByIsActiveTrue();

    /**
     * Units of one activity currently CONSUMED for one day. Consuming =
     * CONFIRMED / CHECKED_IN, or PENDING whose hold has not expired - same
     * rule as {@code ReservationTourTypeRepository.sumConsumingUnits}. A
     * soft-deleted reservation is excluded automatically by Reservation's
     * {@code @SQLRestriction}. Run this INSIDE the transaction that holds
     * the pessimistic lock on the extras row.
     */
    @Query("""
            SELECT COALESCE(SUM(re.quantity), 0)
            FROM ReservationExtra re
            JOIN re.reservation r
            WHERE re.catalogExtraId = :extraId
              AND re.activityDate = :date
              AND re.isActive = true
              AND (:excludeReservationId IS NULL OR r.reservationId <> :excludeReservationId)
              AND (
                    r.status IN (com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
                                 com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN)
                 OR (r.status = com.camping.duneinsolite.model.enums.ReservationStatus.PENDING
                     AND (r.holdExpiresAt IS NULL OR r.holdExpiresAt > :now))
              )
            """)
    long sumConsumingQuantity(@Param("extraId") UUID extraId,
                               @Param("date") LocalDate date,
                               @Param("now") LocalDateTime now,
                               @Param("excludeReservationId") UUID excludeReservationId);
}