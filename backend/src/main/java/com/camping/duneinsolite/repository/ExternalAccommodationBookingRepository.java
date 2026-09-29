package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ExternalAccommodationBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ExternalAccommodationBookingRepository extends JpaRepository<ExternalAccommodationBooking, UUID> {

    @Query("""
            SELECT COALESCE(SUM(e.units), 0)
            FROM ExternalAccommodationBooking e
            WHERE e.accommodationType.id = :accommodationTypeId
              AND e.checkIn <= :night
              AND e.checkOut > :night
              AND (:excludeId IS NULL OR e.id <> :excludeId)
            """)
    long sumUnitsOnNight(@Param("accommodationTypeId") UUID accommodationTypeId,
                         @Param("night") LocalDate night,
                         @Param("excludeId") UUID excludeId);

    @Query("""
            SELECT e FROM ExternalAccommodationBooking e
            JOIN FETCH e.accommodationType a
            WHERE a.tourType.tourTypeId = :tourTypeId
              AND e.checkIn < :rangeEnd
              AND e.checkOut > :rangeStart
            ORDER BY e.checkIn, a.displayOrder, a.name
            """)
    List<ExternalAccommodationBooking> findForCalendar(@Param("tourTypeId") UUID tourTypeId,
                                                        @Param("rangeStart") LocalDate rangeStart,
                                                        @Param("rangeEnd") LocalDate rangeEnd);
}
