package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.AvailabilityBlockRequest;
import com.camping.duneinsolite.dto.response.AvailabilityBlockResponse;
import com.camping.duneinsolite.dto.response.AvailabilityDayResponse;
import com.camping.duneinsolite.service.AvailabilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * Ops-only visibility, not a booking control - see AvailabilityBlock and
 * AvailabilityServiceImpl's own doc comments. ADMIN-only, same as every
 * other backoffice-only controller (CampingSettingsController, etc.).
 */
@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    @GetMapping("/calendar")
    public ResponseEntity<List<AvailabilityDayResponse>> getCalendar(
            @RequestParam UUID tourTypeId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return ResponseEntity.ok(availabilityService.getCalendar(tourTypeId, month));
    }

    @PostMapping("/blocks")
    public ResponseEntity<AvailabilityBlockResponse> createBlock(@Valid @RequestBody AvailabilityBlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(availabilityService.createBlock(request));
    }

    @DeleteMapping("/blocks/{blockId}")
    public ResponseEntity<Void> deleteBlock(@PathVariable UUID blockId) {
        availabilityService.deleteBlock(blockId);
        return ResponseEntity.noContent().build();
    }
}
