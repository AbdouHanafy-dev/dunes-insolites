package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ReviewRequest;
import com.camping.duneinsolite.dto.request.ReviewUpdateRequest;
import com.camping.duneinsolite.dto.response.ReviewResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicReviewResponse;
import com.camping.duneinsolite.model.enums.ProductType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ReviewService {
    ReviewResponse createReview(UUID userId, ReviewRequest request);
    Page<ReviewResponse> getReviewsForProduct(UUID productId, ProductType productType, Pageable pageable);
    Page<ReviewResponse> getMyReviews(UUID userId, Pageable pageable);
    ReviewResponse getReviewById(UUID reviewId);
    ReviewResponse updateReview(UUID reviewId, UUID currentUserId, ReviewUpdateRequest request);
    void deleteReview(UUID reviewId);

    /**
     * Unauthenticated, vitrine-shaped reads (DI-012 pattern) - real reviews
     * only, filtered by the Dunes product's public slug rather than its
     * internal id/ProductType. Exactly one of activitySlug/staySlug should
     * be set, or neither for the site-wide feed.
     */
    List<PublicReviewResponse> getPublicReviews(String activitySlug, String staySlug);
}
