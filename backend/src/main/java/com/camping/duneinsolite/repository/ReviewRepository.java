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

    long countByProductIdAndProductType(UUID productId, ProductType productType);

    boolean existsByUser_UserIdAndProductIdAndProductType(UUID userId, UUID productId, ProductType productType);

    void deleteAllByProductIdAndProductType(UUID productId, ProductType productType);

    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM Review r WHERE r.productId = :productId AND r.productType = :productType")
    Double findAverageRating(@Param("productId") UUID productId, @Param("productType") ProductType productType);
}
