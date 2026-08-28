package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationTourType;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
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
}