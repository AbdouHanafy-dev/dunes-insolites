package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicServiceOptionAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicServiceOptionResponse;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.service.PublicAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * Unauthenticated, vitrine-shaped reads for the "Getting There & Guide"
 * booking step. See SecurityConfig - /api/public/** is permitAll.
 */
@RestController
@RequestMapping("/api/public/service-options")
@RequiredArgsConstructor
public class PublicServiceOptionController {

    private final ExtraRepository extraRepository;
    private final PublicAvailabilityService publicAvailabilityService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@RequestParam(required = false) ExtraCategory category) {
        List<PublicServiceOptionResponse> options = extraRepository.findByIsActiveTrue().stream()
                .filter(o -> category == null || o.getCategory() == category)
                .filter(o -> o.getCategory() == ExtraCategory.GUIDE || o.getCategory() == ExtraCategory.TRANSPORT
                        || o.getCategory() == ExtraCategory.TOUR_OPTION)
                .filter(o -> Boolean.TRUE.equals(o.getIsActive()))
                .sorted(java.util.Comparator.comparingInt(com.camping.duneinsolite.model.Extra::getDisplayOrder))
                .map(PublicServiceOptionResponse::from)
                .toList();
        return ResponseEntity.ok(Map.of("serviceOptions", options));
    }

    @GetMapping("/{slug}/availability")
    public ResponseEntity<PublicServiceOptionAvailabilityResponse> getAvailability(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(publicAvailabilityService.forServiceOption(slug, date));
    }

    /**
     * Same truthful check as {@link #getAvailability}, one entry per day of
     * {@code month} - lets the date picker grey out full days up front.
     */
    @GetMapping("/{slug}/availability-range")
    public ResponseEntity<Map<String, Object>> getAvailabilityRange(
            @PathVariable String slug,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        List<PublicServiceOptionAvailabilityResponse> days = publicAvailabilityService.forServiceOptionMonth(slug, month);
        return ResponseEntity.ok(Map.of("days", days));
    }
}
