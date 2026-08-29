package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReviewRequest;
import com.camping.duneinsolite.dto.request.ReviewUpdateRequest;
import com.camping.duneinsolite.dto.response.ReviewResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.UserNotFoundException;
import com.camping.duneinsolite.mapper.ReviewMapper;
import com.camping.duneinsolite.model.Review;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;
    private final UserRepository userRepository;
    private final TourRepository tourRepository;
    private final TourTypeRepository tourTypeRepository;
    private final ExtraRepository extraRepository;

    @Override
    public ReviewResponse createReview(UUID userId, ReviewRequest request) {
        validateProductExists(request.getProductId(), request.getProductType());

        if (reviewRepository.existsByUser_UserIdAndProductIdAndProductType(
                userId, request.getProductId(), request.getProductType())) {
            throw new ConflictException("You have already reviewed this product");
        }

        Review review = Review.builder()
                .user(userRepository.findById(userId)
                        .orElseThrow(() -> new UserNotFoundException(userId)))
                .productId(request.getProductId())
                .productType(request.getProductType())
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Review saved = reviewRepository.save(review);
        recomputeAggregate(request.getProductId(), request.getProductType());
        return reviewMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getReviewsForProduct(UUID productId, ProductType productType, Pageable pageable) {
        return reviewRepository.findByProductIdAndProductType(productId, productType, pageable)
                .map(reviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(UUID userId, Pageable pageable) {
        return reviewRepository.findByUser_UserId(userId, pageable).map(reviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewResponse getReviewById(UUID reviewId) {
        return reviewMapper.toResponse(findById(reviewId));
    }

    @Override
    public ReviewResponse updateReview(UUID reviewId, UUID currentUserId, ReviewUpdateRequest request) {
        Review review = findById(reviewId);
        if (!review.getUser().getUserId().equals(currentUserId)) {
            throw new AccessDeniedException("You can only edit your own review");
        }
        reviewMapper.updateEntity(request, review);
        Review saved = reviewRepository.save(review);
        recomputeAggregate(review.getProductId(), review.getProductType());
        return reviewMapper.toResponse(saved);
    }

    @Override
    public void deleteReview(UUID reviewId) {
        Review review = findById(reviewId);
        reviewRepository.delete(review);
        recomputeAggregate(review.getProductId(), review.getProductType());
    }

    private Review findById(UUID reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));
    }

    private void validateProductExists(UUID productId, ProductType productType) {
        boolean exists = switch (productType) {
            case TOUR -> tourRepository.existsById(productId);
            case TOURTYPE -> tourTypeRepository.existsById(productId);
            case EXTRA -> extraRepository.existsById(productId);
        };
        if (!exists) {
            throw new ResourceNotFoundException("Product not found: " + productId);
        }
    }

    private void recomputeAggregate(UUID productId, ProductType productType) {
        long count = reviewRepository.countByProductIdAndProductType(productId, productType);
        Double average = count > 0 ? reviewRepository.findAverageRating(productId, productType) : null;

        switch (productType) {
            case TOUR -> tourRepository.findById(productId).ifPresent(tour -> {
                tour.setAverageRating(average);
                tour.setReviewCount((int) count);
                tourRepository.save(tour);
            });
            case TOURTYPE -> tourTypeRepository.findById(productId).ifPresent(tourType -> {
                tourType.setAverageRating(average);
                tourType.setReviewCount((int) count);
                tourTypeRepository.save(tourType);
            });
            case EXTRA -> extraRepository.findById(productId).ifPresent(extra -> {
                extra.setAverageRating(average);
                extra.setReviewCount((int) count);
                extraRepository.save(extra);
            });
        }
    }
}
