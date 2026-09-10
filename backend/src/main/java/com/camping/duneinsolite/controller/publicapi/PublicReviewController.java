package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Unauthenticated, vitrine-shaped reads for real guest reviews. See
 * SecurityConfig - /api/public/** is permitAll. Internal-shaped reads (with
 * pagination, product id/type) stay on ReviewController.
 *
 * Found live (UI/UX audit, 30 Aug 2026): this endpoint did not exist before
 * today. ReviewController's own GET endpoints are all authenticated, so the
 * vitrine's every call to fetch reviews 401'd and silently fell back to
 * lib/data/reviews.ts's explicitly-fake placeholder content - permanently,
 * not as the "transient failure" fallback was meant for. See
 * ReviewServiceImpl.getPublicReviews's own comment for the full story.
 */
@RestController
@RequestMapping("/api/public/reviews")
@RequiredArgsConstructor
public class PublicReviewController {

    private final ReviewService reviewService;

    // Wrapped in {"reviews": [...]}, matching the frontend's local
    // app/api/reviews/route.ts stand-in exactly - same convention as every
    // other public endpoint in this package.
    @GetMapping
    public ResponseEntity<Map<String, Object>> getReviews(
            @RequestParam(required = false) String activity,
            @RequestParam(required = false) String stay) {
        return ResponseEntity.ok(Map.of("reviews", reviewService.getPublicReviews(activity, stay)));
    }
}
