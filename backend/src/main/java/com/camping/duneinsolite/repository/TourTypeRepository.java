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
    List<TourType> findByIsActiveTrue();
    Optional<TourType> findBySlugAndIsActiveTrue(String slug);
}