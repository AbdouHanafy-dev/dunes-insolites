package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.AvailabilityBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AvailabilityBlockRepository extends JpaRepository<AvailabilityBlock, UUID> {

    List<AvailabilityBlock> findByTourTypeTourTypeIdAndDateBetween(
            UUID tourTypeId, LocalDate start, LocalDate end);

    Optional<AvailabilityBlock> findByTourTypeTourTypeIdAndDate(UUID tourTypeId, LocalDate date);
}
