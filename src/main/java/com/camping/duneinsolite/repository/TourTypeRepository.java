package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.TourType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface TourTypeRepository extends JpaRepository<TourType, UUID> {
    boolean existsByName(String name);
}