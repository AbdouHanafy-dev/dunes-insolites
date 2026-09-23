package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.TourType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TourTypeRepository extends JpaRepository<TourType, UUID> {
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    List<TourType> findByIsActiveTrue();
    Optional<TourType> findBySlugAndIsActiveTrue(String slug);

    /** The camp that multi-day circuits sleep at - at most one row (unique index). */
    Optional<TourType> findFirstByCircuitCampTrue();

    /** Clears the circuit-camp flag everywhere except {@code keepId}, so the unique index holds. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "UPDATE TourType t SET t.circuitCamp = false WHERE t.circuitCamp = true AND t.tourTypeId <> :keepId")
    void clearCircuitCampExcept(@org.springframework.data.repository.query.Param("keepId") UUID keepId);
}
