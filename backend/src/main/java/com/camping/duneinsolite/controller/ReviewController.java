package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ReviewRequest;
import com.camping.duneinsolite.dto.request.ReviewUpdateRequest;
import com.camping.duneinsolite.dto.response.ReviewResponse;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewResponse> createReview(@AuthenticationPrincipal Jwt jwt,
                                                         @Valid @RequestBody ReviewRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createReview(userId, request));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ReviewResponse>> getReviewsForProduct(
            @RequestParam UUID productId,
            @RequestParam ProductType productType,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reviewService.getReviewsForProduct(productId, productType, pageable));
    }

    @GetMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewResponse> getReviewById(@PathVariable UUID reviewId) {
        return ResponseEntity.ok(reviewService.getReviewById(reviewId));
    }

    @PutMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewResponse> updateReview(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable UUID reviewId,
                                                         @Valid @RequestBody ReviewUpdateRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(reviewService.updateReview(reviewId, userId, request));
    }

    @DeleteMapping("/{reviewId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteReview(@PathVariable UUID reviewId) {
        reviewService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }
}
