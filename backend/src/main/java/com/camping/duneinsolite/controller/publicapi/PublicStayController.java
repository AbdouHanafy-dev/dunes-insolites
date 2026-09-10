package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import com.camping.duneinsolite.service.PublicAvailabilityService;
import com.camping.duneinsolite.service.TourTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/**
 * Unauthenticated, vitrine-shaped reads for nuitées (camp/bivouac stays).
 * See SecurityConfig - /api/public/** is permitAll. Internal-shaped reads
 * for the admin apps stay on TourTypeController.
 */
@RestController
@RequestMapping("/api/public/stays")
@RequiredArgsConstructor
public class PublicStayController {

    private final TourTypeService tourTypeService;
    private final PublicAvailabilityService publicAvailabilityService;

    // Wrapped in {"stays": [...]}, not a bare array - matches the
    // frontend's local app/api/stays/route.ts stand-in exactly, so
    // frontend/lib/api.ts needs no special-casing between the two.
    @GetMapping
    public ResponseEntity<Map<String, Object>> getStays(
            @RequestParam(required = false) String locale) {
        return ResponseEntity.ok(Map.of("stays", tourTypeService.getPublicStays(locale)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PublicStayResponse> getStay(
            @PathVariable String slug, @RequestParam(required = false) String locale) {
        return ResponseEntity.ok(tourTypeService.getPublicStayBySlug(slug, locale));
    }

    /**
     * Truthful accommodation availability for one night. Advisory — the booking
     * endpoint re-checks under a lock. Per active+priced tier: AVAILABLE /
     * UNAVAILABLE / UNKNOWN (UNKNOWN = unit inventory not configured yet).
     */
    @GetMapping("/{slug}/availability")
    public ResponseEntity<PublicAvailabilityResponse> getAvailability(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(publicAvailabilityService.forStay(slug, date));
    }
}
