package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Review;
import com.camping.duneinsolite.model.enums.ProductType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Page<Review> findByProductIdAndProductType(UUID productId, ProductType productType, Pageable pageable);

    // Unpaged variants for the public vitrine feed (DI-012 pattern already
    // used by stays/activities) - the real review volume for one camp is
    // small enough that a page-through UI would be over-engineering; the
    // frontend just wants "all of them, newest first".
    java.util.List<Review> findByProductIdAndProductTypeOrderByCreatedAtDesc(UUID productId, ProductType productType);

    java.util.List<Review> findAllByOrderByCreatedAtDesc();

    Page<Review> findByUser_UserId(UUID userId, Pageable pageable);

    // Self-service data export (Phase 5).
    java.util.List<Review> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);

    long countByProductIdAndProductType(UUID productId, ProductType productType);

    boolean existsByUser_UserIdAndProductIdAndProductType(UUID userId, UUID productId, ProductType productType);

    void deleteAllByProductIdAndProductType(UUID productId, ProductType productType);

    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM Review r WHERE r.productId = :productId AND r.productType = :productType")
    Double findAverageRating(@Param("productId") UUID productId, @Param("productType") ProductType productType);
}
