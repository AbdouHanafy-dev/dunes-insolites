package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.MaintenanceWindow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaintenanceWindowRepository extends JpaRepository<MaintenanceWindow, UUID> {

    List<MaintenanceWindow> findAllByOrderByPathAsc();

    Optional<MaintenanceWindow> findByPath(String path);

    // Vitrine-facing: active, and not already past its own countdown - an
    // expired window should stop blocking the page on its own, not require
    // an editor to remember to come back and flip it off.
    @Query("SELECT w FROM MaintenanceWindow w WHERE w.isActive = true "
            + "AND (w.endsAt IS NULL OR w.endsAt > :now)")
    List<MaintenanceWindow> findAllCurrentlyActive(@Param("now") LocalDateTime now);
}
