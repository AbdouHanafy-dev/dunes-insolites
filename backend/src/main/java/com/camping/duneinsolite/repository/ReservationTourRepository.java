package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationTour;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationTourRepository extends JpaRepository<ReservationTour, UUID> {

    // Real "booked N times" social-proof count for a Tour's public card -
    // never fabricated. PENDING is deliberately excluded: it can be an
    // unconfirmed public hold (see ReservationStatus's own comment), not
    // yet a real booking. [since, until) half-open range, same idiom as
    // ReservationRepository/StatisticsRepository's date-range queries.
    @Query("""
        SELECT COUNT(rt)
        FROM ReservationTour rt
        JOIN rt.reservation r
        WHERE rt.catalogTourId = :tourId
          AND r.status IN :statuses
          AND r.createdAt >= :since
          AND r.createdAt < :until
    """)
    long countBookings(
            @Param("tourId") UUID tourId,
            @Param("statuses") List<ReservationStatus> statuses,
            @Param("since") LocalDateTime since,
            @Param("until") LocalDateTime until);
}
