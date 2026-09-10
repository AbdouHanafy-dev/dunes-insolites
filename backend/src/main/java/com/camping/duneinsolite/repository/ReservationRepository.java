package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, UUID>, JpaSpecificationExecutor<Reservation> {
    List<Reservation> findByUserUserIdOrderByCreatedAtDesc(UUID userId);

    // Public booking idempotency (V7). The @SQLRestriction on the entity means
    // a soft-deleted reservation with this key is not returned — a retry after
    // deletion correctly creates a fresh one.
    java.util.Optional<Reservation> findByIdempotencyKey(String idempotencyKey);
    List<Reservation> findByUserUserIdAndStatusIn(UUID userId, List<ReservationStatus> statuses);
    List<Reservation> findByStatus(ReservationStatus status);

    // For the email consumer: loads the owning User in the same query so the
    // recipient can be read outside any open session (the consumer runs on a
    // RabbitMQ listener thread, not inside a service transaction).
    @Query("SELECT r FROM Reservation r JOIN FETCH r.user WHERE r.reservationId = :id")
    java.util.Optional<Reservation> findByIdWithUser(@Param("id") UUID id);

    @Query("SELECT r FROM Reservation r LEFT JOIN FETCH r.tourTypes WHERE r.reservationId = :id")
    java.util.Optional<Reservation> findByIdWithTourTypes(@Param("id") UUID id);

    // Phase 2 — hold-expiry sweep. Idempotent: only flips PENDING holds whose
    // expiry has passed. Availability already treats these as non-consuming, so
    // this is housekeeping/reporting, not correctness-critical.
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE Reservation r
               SET r.status = com.camping.duneinsolite.model.enums.ReservationStatus.EXPIRED,
                   r.updatedAt = :now
             WHERE r.status = com.camping.duneinsolite.model.enums.ReservationStatus.PENDING
               AND r.holdExpiresAt IS NOT NULL
               AND r.holdExpiresAt <= :now
            """)
    int expireStaleHolds(@Param("now") java.time.LocalDateTime now);
    List<Reservation> findByUserOrderByCreatedAtDesc(User user);
    @Query("SELECT r FROM Reservation r WHERE LOWER(r.user.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Reservation> searchByUserName(@Param("name") String name);

    // finds by date across all 3 reservation types correctly
    List<Reservation> findByCheckInDateOrServiceDate(LocalDate checkInDate, LocalDate serviceDate);

    @Query("SELECT r FROM Reservation r WHERE r.status != com.camping.duneinsolite.model.enums.ReservationStatus.COMPLETED")
    List<Reservation> findAllActive();
    @Query("""
    SELECT r FROM Reservation r
    WHERE r.status != com.camping.duneinsolite.model.enums.ReservationStatus.COMPLETED
    ORDER BY 
      CASE 
        WHEN (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
              AND r.checkInDate >= :today)
          OR (r.reservationType != com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
              AND r.serviceDate >= :today)
        THEN 0
        ELSE 1
      END ASC,
      CASE 
        WHEN r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT 
        THEN r.checkInDate
        ELSE r.serviceDate
      END ASC
""")
    List<Reservation> findAllActive(@Param("today") LocalDate today);


    @Query("""
    SELECT r FROM Reservation r
    WHERE (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
           AND r.checkInDate = :date)
       OR (r.reservationType != com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
           AND r.serviceDate = :date)
    ORDER BY r.createdAt DESC
""")
    List<Reservation> findAllByDate(@Param("date") LocalDate date);


    // camping
    @Query("""
    SELECT r FROM Reservation r
    WHERE (
        (
            r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
            AND r.status IN (
                com.camping.duneinsolite.model.enums.ReservationStatus.PENDING,
                com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
                com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN
            )
            AND r.checkInDate >= :today
        )
        OR
        (
            r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
            AND r.status = com.camping.duneinsolite.model.enums.ReservationStatus.COMPLETED
            AND r.completedAt >= :cutoff
        )
        OR
        (
            r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
            AND r.status IN (
                com.camping.duneinsolite.model.enums.ReservationStatus.PENDING,
                com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
                com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN
            )
            AND r.serviceDate >= :today
        )
        OR
        (
            r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
            AND r.status = com.camping.duneinsolite.model.enums.ReservationStatus.COMPLETED
            AND r.completedAt >= :cutoff
        )
        OR
        (
            r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
            AND r.checkInDate IS NOT NULL
            AND r.status IN (
                com.camping.duneinsolite.model.enums.ReservationStatus.PENDING,
                com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
                com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN
            )
            AND r.checkInDate >= :today
        )
        OR
        (
            r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
            AND r.checkInDate IS NOT NULL
            AND r.status = com.camping.duneinsolite.model.enums.ReservationStatus.COMPLETED
            AND r.completedAt >= :cutoff
        )
    )
    ORDER BY
        CASE
            WHEN r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
              OR (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS AND r.checkInDate IS NOT NULL)
            THEN r.checkInDate
            ELSE r.serviceDate
        END ASC
""")
    List<Reservation> findCampingActive(
            @Param("today") LocalDate today,
            @Param("cutoff") LocalDateTime cutoff
    );

    @Query("""
    SELECT r FROM Reservation r
    WHERE r.status IN (
        com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
        com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN,
        com.camping.duneinsolite.model.enums.ReservationStatus.PENDING
    )
    AND LOWER(r.user.name) LIKE LOWER(CONCAT('%', :name, '%'))
    AND (
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
         AND r.checkInDate >= :today)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
         AND r.serviceDate >= :today)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
         AND r.checkInDate IS NOT NULL
         AND r.checkInDate >= :today)
    )
    ORDER BY r.createdAt DESC
""")
    List<Reservation> findCampingActiveByName(@Param("name") String name, @Param("today") LocalDate today);

    @Query("""
    SELECT r FROM Reservation r
    WHERE r.status = :status
    AND (
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
         AND r.checkInDate >= :today)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
         AND r.serviceDate >= :today)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
         AND r.checkInDate IS NOT NULL
         AND r.checkInDate >= :today)
    )
    ORDER BY
      CASE
        WHEN r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
          OR (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS AND r.checkInDate IS NOT NULL)
        THEN r.checkInDate
        ELSE r.serviceDate
      END ASC
""")
    List<Reservation> findCampingActiveByStatus(@Param("status") ReservationStatus status, @Param("today") LocalDate today);

    // by-date — all statuses, HEBERGEMENT + EXTRAS + TOURS(with hebergements), exact date match
    @Query("""
    SELECT r FROM Reservation r
    WHERE (
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
         AND r.checkInDate = :date)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
         AND r.serviceDate = :date)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
         AND r.checkInDate IS NOT NULL
         AND r.checkInDate = :date)
    )
    ORDER BY r.createdAt DESC
""")
    List<Reservation> findCampingActiveByDate(@Param("date") LocalDate date);


    // CHECKED_IN — HEBERGEMENT + EXTRAS + TOURS(with hebergements)
    @Query("""
    SELECT r FROM Reservation r
    WHERE r.status = com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN
    AND (
        r.reservationType IN (
            com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT,
            com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
        )
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
         AND r.checkInDate IS NOT NULL)
    )
""")
    List<Reservation> findCampingCheckedIn();

    // CONFIRMED + arriving today — HEBERGEMENT checkInDate=today, EXTRAS serviceDate=today, TOURS checkInDate=today
    @Query("""
    SELECT r FROM Reservation r
    WHERE r.status = com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED
    AND (
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
         AND r.checkInDate = :today)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.EXTRAS
         AND r.serviceDate = :today)
        OR
        (r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
         AND r.checkInDate IS NOT NULL
         AND r.checkInDate = :today)
    )
""")
    List<Reservation> findCampingArrivingToday(@Param("today") LocalDate today);

    // capacity — HEBERGEMENT reservations occupying a night in [rangeStart, rangeEnd)
    @Query("""
    SELECT r FROM Reservation r
    WHERE r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.HEBERGEMENT
      AND r.status IN (
          com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
          com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN
      )
      AND r.checkInDate < :rangeEnd
      AND r.checkOutDate > :rangeStart
      AND (:excludeReservationId IS NULL OR r.reservationId <> :excludeReservationId)
""")
    List<Reservation> findOccupyingHebergementOverlapping(
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd,
            @Param("excludeReservationId") UUID excludeReservationId);

    // capacity — TOURS reservations with a lodging component whose derived span overlaps [rangeStart, rangeEnd);
    // exact per-segment/per-night overlap is computed by the caller from the (lazily-loaded) hebergements.
    // No JOIN FETCH here deliberately — Reservation.tours and ReservationTour.hebergements are both List
    // ("bag") associations, and Hibernate cannot fetch two bags in one query (MultipleBagFetchException).
    // The caller runs inside ReservationServiceImpl's transaction, so lazy access afterward is safe.
    @Query("""
    SELECT r FROM Reservation r
    WHERE r.reservationType = com.camping.duneinsolite.model.enums.ReservationType.TOURS
      AND r.status IN (
          com.camping.duneinsolite.model.enums.ReservationStatus.CONFIRMED,
          com.camping.duneinsolite.model.enums.ReservationStatus.CHECKED_IN
      )
      AND r.checkInDate IS NOT NULL
      AND r.checkInDate < :rangeEnd
      AND r.checkOutDate > :rangeStart
      AND (:excludeReservationId IS NULL OR r.reservationId <> :excludeReservationId)
""")
    List<Reservation> findOccupyingTourHebergementOverlapping(
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd,
            @Param("excludeReservationId") UUID excludeReservationId);
}
