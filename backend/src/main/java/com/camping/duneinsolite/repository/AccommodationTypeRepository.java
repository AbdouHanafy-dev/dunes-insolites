package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.AccommodationType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccommodationTypeRepository extends JpaRepository<AccommodationType, UUID> {

    List<AccommodationType> findByTourType_TourTypeIdOrderByDisplayOrderAsc(UUID tourTypeId);

    /**
     * Phase 2 — {@code SELECT ... FOR UPDATE} on one tier row. All allocations
     * for a tier serialize on this lock, held to the end of the caller's
     * transaction. Different tiers lock different rows (independent inventory).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AccommodationType a WHERE a.id = :id")
    Optional<AccommodationType> lockById(@Param("id") UUID id);

    @Query("""
        SELECT a FROM AccommodationType a
        WHERE a.tourType.tourTypeId = :tourTypeId AND a.slug = :slug
    """)
    Optional<AccommodationType> findByTourTypeAndSlug(@Param("tourTypeId") UUID tourTypeId,
                                                     @Param("slug") String slug);

    /**
     * Every distinct TourType id that has at least one accommodation tier
     * configured. There is only one physical camp (Sabria), so in a
     * correctly configured catalogue this resolves to exactly one id — the
     * nuitée-campement TourType whose tiers a Tour that
     * {@code overnightsAtCamp} reuses. Callers must fail closed (not guess)
     * when this doesn't return exactly one id.
     */
    @Query("SELECT DISTINCT a.tourType.tourTypeId FROM AccommodationType a")
    List<UUID> findDistinctTourTypeIds();
}
