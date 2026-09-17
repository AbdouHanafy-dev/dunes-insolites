package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationServiceOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ReservationServiceOptionRepository extends JpaRepository<ReservationServiceOption, UUID> {
    List<ReservationServiceOption> findByReservationReservationId(UUID reservationId);
    List<ReservationServiceOption> findByIsActiveTrue();

    /**
     * Units of one service option currently CONSUMED for one day - same
     * rule as {@code ReservationExtraRepository.sumConsumingQuantity}.
     */
    @Query("""
            SELECT COALESCE(SUM(rso.quantity), 0)
            FROM ReservationServiceOption rso
            JOIN rso.reservation r
            WHERE rso.catalogServiceOptionId = :serviceOptionId
              AND rso.serviceDate = :date
              AND rso.isActive = true
              AND (:excludeReservationId IS NULL OR r.reservationId <> :excludeReservationId)
              AND (
                    r.status IN (com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
                                 com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN)
                 OR (r.status = com.camping.duneinsolite.model.enums.ReservationStatus.PENDING
                     AND (r.holdExpiresAt IS NULL OR r.holdExpiresAt > :now))
              )
            """)
    long sumConsumingQuantity(@Param("serviceOptionId") UUID serviceOptionId,
                               @Param("date") LocalDate date,
                               @Param("now") LocalDateTime now,
                               @Param("excludeReservationId") UUID excludeReservationId);
}
