package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.CampingSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CampingSettingsRepository extends JpaRepository<CampingSettings, Long> {

    /**
     * Pessimistic-write lock on the settings row. {@code ReservationCapacityValidator}
     * takes this before it reads the "others per night" totals, so two concurrent
     * capacity-checked bookings serialise here — the second waits until the first
     * commits, then sees its headcount. Held to transaction commit (the caller is
     * {@code @Transactional}). Cheap: a desert camp confirms a handful of
     * reservations a day, and only HEBERGEMENT bookings reach this path.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM CampingSettings s WHERE s.id = :id")
    Optional<CampingSettings> findByIdForUpdate(@Param("id") Long id);
}
