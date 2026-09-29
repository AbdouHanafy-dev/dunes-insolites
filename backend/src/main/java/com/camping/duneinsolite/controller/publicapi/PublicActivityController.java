package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicActivityAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicActivityResponse;
import com.camping.duneinsolite.service.ExtraService;
import com.camping.duneinsolite.service.PublicAvailabilityService;
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
 * Unauthenticated, vitrine-shaped reads for on-site activities (camel trek,
 * quad, sandboarding, etc - modeled as Extra). See SecurityConfig -
 * /api/public/** is permitAll. Internal-shaped reads for the admin apps stay
 * on ExtraController.
 */
@RestController
@RequestMapping("/api/public/activities")
@RequiredArgsConstructor
public class PublicActivityController {

    private final ExtraService extraService;
    private final PublicAvailabilityService publicAvailabilityService;

    // Wrapped in {"activities": [...]}, not a bare array - matches the
    // frontend's local app/api/activities/route.ts stand-in exactly, so
    // frontend/lib/api.ts needs no special-casing between the two.
    @GetMapping
    public ResponseEntity<Map<String, Object>> getActivities(
            @RequestParam(required = false) String locale) {
        return ResponseEntity.ok(Map.of("activities", extraService.getPublicActivities(locale)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PublicActivityResponse> getActivity(
            @PathVariable String slug, @RequestParam(required = false) String locale) {
        return ResponseEntity.ok(extraService.getPublicActivityBySlug(slug, locale));
    }

    /**
     * Truthful activity availability for one day. Advisory — the booking
     * endpoint re-checks under a lock. AVAILABLE / UNAVAILABLE / UNKNOWN
     * (UNKNOWN = unit inventory not configured yet).
     */
    @GetMapping("/{slug}/availability")
    public ResponseEntity<PublicActivityAvailabilityResponse> getAvailability(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(publicAvailabilityService.forActivity(slug, date));
    }

    /**
     * Same truthful check as {@link #getAvailability}, one entry per day of
     * {@code month} - lets the date picker grey out full days up front.
     */
    @GetMapping("/{slug}/availability-range")
    public ResponseEntity<Map<String, Object>> getAvailabilityRange(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        List<PublicActivityAvailabilityResponse> days = publicAvailabilityService.forActivityMonth(slug, month);
        return ResponseEntity.ok(Map.of("days", days));
    }
}
