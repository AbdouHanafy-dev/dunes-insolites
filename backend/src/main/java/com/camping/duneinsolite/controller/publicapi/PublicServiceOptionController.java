package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicServiceOptionAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicServiceOptionResponse;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
import com.camping.duneinsolite.service.PublicAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    private final ServiceOptionRepository serviceOptionRepository;
    private final PublicAvailabilityService publicAvailabilityService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@RequestParam(required = false) ServiceOptionCategory category) {
        List<PublicServiceOptionResponse> options = (category != null
                ? serviceOptionRepository.findByCategoryOrderByDisplayOrderAsc(category)
                : serviceOptionRepository.findByActiveTrueOrderByDisplayOrderAsc())
                .stream()
                .filter(o -> o.isActive() && o.isBookable())
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
}
