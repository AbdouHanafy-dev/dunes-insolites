package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ReviewRequest;
import com.camping.duneinsolite.dto.request.ReviewUpdateRequest;
import com.camping.duneinsolite.dto.response.ReviewResponse;
import com.camping.duneinsolite.model.enums.ProductType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ReviewService {
    ReviewResponse createReview(UUID userId, ReviewRequest request);
    Page<ReviewResponse> getReviewsForProduct(UUID productId, ProductType productType, Pageable pageable);
    ReviewResponse getReviewById(UUID reviewId);
    ReviewResponse updateReview(UUID reviewId, UUID currentUserId, ReviewUpdateRequest request);
    void deleteReview(UUID reviewId);
}
