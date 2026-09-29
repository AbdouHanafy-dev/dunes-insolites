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
import java.time.YearMonth;
import java.util.List;
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
     * Truthful accommodation availability across [date, date + nights).
     * {@code nights} defaults to 1 (single-night stays). Advisory — the
     * booking endpoint re-checks the same range under a lock. Per
     * active+priced tier: AVAILABLE / UNAVAILABLE / UNKNOWN (UNKNOWN = unit
     * inventory not configured yet).
     */
    @GetMapping("/{slug}/availability")
    public ResponseEntity<PublicAvailabilityResponse> getAvailability(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer nights) {
        return ResponseEntity.ok(publicAvailabilityService.forStay(slug, date, nights));
    }

    /**
     * Same truthful check as {@link #getAvailability}, one entry per day of
     * {@code month} - lets the date picker grey out full days up front.
     */
    @GetMapping("/{slug}/availability-range")
    public ResponseEntity<Map<String, Object>> getAvailabilityRange(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
            @RequestParam(required = false) Integer nights) {
        List<PublicAvailabilityResponse> days = publicAvailabilityService.forStayMonth(slug, month, nights);
        return ResponseEntity.ok(Map.of("days", days));
    }
}
