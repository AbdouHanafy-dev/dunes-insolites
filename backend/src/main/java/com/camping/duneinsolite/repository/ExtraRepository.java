package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Extra;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExtraRepository extends JpaRepository<Extra, UUID> {
    List<Extra> findByIsActiveTrue();
    boolean existsByName(String name);
    Optional<Extra> findBySlugAndIsActiveTrue(String slug);

    /**
     * {@code SELECT ... FOR UPDATE} on one activity row - all capacity
     * allocations for an activity serialize on this lock, held to the end of
     * the caller's transaction. Different activities lock different rows
     * (independent inventory), same pattern as
     * {@code AccommodationTypeRepository.lockById}.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Extra e WHERE e.extraId = :id")
    Optional<Extra> lockById(@Param("id") UUID id);
}