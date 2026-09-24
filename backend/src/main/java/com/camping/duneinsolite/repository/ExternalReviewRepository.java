package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ExternalReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExternalReviewRepository extends JpaRepository<ExternalReview, UUID> {

    List<ExternalReview> findAllByOrderByReviewDateDescCreatedAtDesc();

    List<ExternalReview> findByPublishedTrueOrderByReviewDateDescCreatedAtDesc();

    long countByPlatform_PlatformId(UUID platformId);
}
