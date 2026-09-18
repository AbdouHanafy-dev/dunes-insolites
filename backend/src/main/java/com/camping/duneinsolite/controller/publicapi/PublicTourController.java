package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicTourResponse;
import com.camping.duneinsolite.service.TourService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Unauthenticated, vitrine-shaped reads for Route Insolite's multi-day
 * circuits. See SecurityConfig - /api/public/** is permitAll. Internal-shaped
 * reads for the admin apps stay on TourController.
 *
 * Reversed 18 Sep 2026 (business owner, explicit) - see docs/OPEN-QUESTIONS.md
 * Q6's addendum and CLAUDE.md's "multi-day touring" note for why this now
 * exists where it previously didn't.
 *
 * No availability endpoint here, unlike stays/activities - Tour has no
 * capacity/inventory concept today (request-to-book, staff confirm), so
 * there's nothing truthful to check against.
 */
@RestController
@RequestMapping("/api/public/tours")
@RequiredArgsConstructor
public class PublicTourController {

    private final TourService tourService;

    // Wrapped in {"tours": [...]}, matching every other public catalog
    // endpoint's convention.
    @GetMapping
    public ResponseEntity<Map<String, Object>> getTours(
            @RequestParam(required = false) String locale) {
        return ResponseEntity.ok(Map.of("tours", tourService.getPublicTours(locale)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PublicTourResponse> getTour(
            @PathVariable String slug, @RequestParam(required = false) String locale) {
        return ResponseEntity.ok(tourService.getPublicTourBySlug(slug, locale));
    }
}
