package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ServiceOptionRepository extends JpaRepository<ServiceOption, UUID> {

    List<ServiceOption> findByCategoryOrderByDisplayOrderAsc(ServiceOptionCategory category);

    List<ServiceOption> findByActiveTrueOrderByDisplayOrderAsc();

    Optional<ServiceOption> findBySlug(String slug);

    Optional<ServiceOption> findBySlugAndActiveTrue(String slug);

    /**
     * {@code SELECT ... FOR UPDATE} on one option row - same pattern as
     * {@code AccommodationTypeRepository.lockById} / {@code ExtraRepository.lockById}.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ServiceOption s WHERE s.id = :id")
    Optional<ServiceOption> lockById(@Param("id") UUID id);
}
