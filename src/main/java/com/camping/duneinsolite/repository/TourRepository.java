package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Tour;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TourRepository extends JpaRepository<Tour, UUID> {
    List<Tour> findByIsActiveTrue();
    boolean existsByName(String name);
}