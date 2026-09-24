package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReviewRequest;
import com.camping.duneinsolite.dto.request.ReviewUpdateRequest;
import com.camping.duneinsolite.dto.response.ReviewResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicReviewResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.UserNotFoundException;
import com.camping.duneinsolite.mapper.ReviewMapper;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.Review;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.ExternalReviewService;
import com.camping.duneinsolite.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
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
    private final ExternalReviewService externalReviewService;

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

    // Found live (UI/UX audit, 30 Aug 2026): the vitrine had no public
    // reviews endpoint at all - only this class's authenticated methods
    // above, which 401 for an anonymous visitor. lib/api.ts's getReviews()
    // treated that 401 as a "transient failure" and silently fell back to
    // lib/data/reviews.ts's explicitly-marked-fake placeholder content -
    // permanently, not transiently, since the real endpoint never existed.
    // The vitrine was serving fabricated reviews, and feeding them into
    // AggregateRating JSON-LD, on every real page load. This is the real
    // fix: with zero real reviews today, this correctly returns an empty
    // list instead of anything invented.
    @Override
    @Transactional(readOnly = true)
    public List<PublicReviewResponse> getPublicReviews(String activitySlug, String staySlug, String tourSlug) {
        List<Review> reviews;
        ProductType filterType = null;

        if (activitySlug != null && !activitySlug.isBlank()) {
            Optional<Extra> extra = extraRepository.findBySlugAndIsActiveTrue(activitySlug);
            if (extra.isEmpty()) return List.of();
            reviews = reviewRepository.findByProductIdAndProductTypeOrderByCreatedAtDesc(
                    extra.get().getExtraId(), ProductType.EXTRA);
            filterType = ProductType.EXTRA;
        } else if (staySlug != null && !staySlug.isBlank()) {
            Optional<TourType> tourType = tourTypeRepository.findBySlugAndIsActiveTrue(staySlug);
            if (tourType.isEmpty()) return List.of();
            reviews = reviewRepository.findByProductIdAndProductTypeOrderByCreatedAtDesc(
                    tourType.get().getTourTypeId(), ProductType.TOURTYPE);
            filterType = ProductType.TOURTYPE;
        } else if (tourSlug != null && !tourSlug.isBlank()) {
            Optional<Tour> tour = tourRepository.findBySlugAndIsActiveTrue(tourSlug);
            if (tour.isEmpty()) return List.of();
            reviews = reviewRepository.findByProductIdAndProductTypeOrderByCreatedAtDesc(
                    tour.get().getTourId(), ProductType.TOUR);
            filterType = ProductType.TOUR;
        } else {
            reviews = reviewRepository.findAllByOrderByCreatedAtDesc();
        }

        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE;
        ProductType effectiveFilterType = filterType;
        List<PublicReviewResponse> inApp =
                reviews.stream().map(r -> toPublicResponse(r, effectiveFilterType, iso)).toList();

        // Reviews copied from Google/TripAdvisor aren't tied to a product, so
        // they only belong in the site-wide feed - never a product-scoped one.
        if (effectiveFilterType != null) return inApp;
        return java.util.stream.Stream.concat(externalReviewService.getPublished().stream(), inApp.stream())
                .sorted(java.util.Comparator.comparing(PublicReviewResponse::getDate).reversed())
                .toList();
    }

    private PublicReviewResponse toPublicResponse(Review r, ProductType knownFilterType, DateTimeFormatter iso) {
        // Resolve the product's public slug for whichever type this review
        // is actually on - not just the type we filtered by (the site-wide,
        // unfiltered feed has no known type per row).
        ProductType type = knownFilterType != null ? knownFilterType : r.getProductType();
        String activitySlug = type == ProductType.EXTRA
                ? extraRepository.findById(r.getProductId()).map(Extra::getSlug).orElse(null)
                : null;
        String staySlug = type == ProductType.TOURTYPE
                ? tourTypeRepository.findById(r.getProductId()).map(TourType::getSlug).orElse(null)
                : null;
        String tourSlug = type == ProductType.TOUR
                ? tourRepository.findById(r.getProductId()).map(Tour::getSlug).orElse(null)
                : null;

        return PublicReviewResponse.builder()
                .id(r.getReviewId().toString())
                .name(r.getUser().getName())
                .rating(r.getRating())
                .date(r.getCreatedAt().format(iso))
                .body(r.getComment())
                .activitySlug(activitySlug)
                .staySlug(staySlug)
                .tourSlug(tourSlug)
                .source("direct")
                .build();
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
