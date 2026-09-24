package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReviewPlatform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewPlatformRepository extends JpaRepository<ReviewPlatform, UUID> {

    List<ReviewPlatform> findAllByOrderByNameAsc();

    Optional<ReviewPlatform> findByNameIgnoreCase(String name);
}
