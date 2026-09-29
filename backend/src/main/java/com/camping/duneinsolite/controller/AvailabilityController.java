package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.AvailabilityBlockRequest;
import com.camping.duneinsolite.dto.request.ExternalAccommodationBookingRequest;
import com.camping.duneinsolite.dto.response.AvailabilityBlockResponse;
import com.camping.duneinsolite.dto.response.AvailabilityDayResponse;
import com.camping.duneinsolite.dto.response.ExternalAccommodationBookingResponse;
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
 * Operations calendar and accommodation inventory controls. Was a single class-level
 * hasRole('ADMIN') - moved to per-method @perm checks (see PageController's
 * comment for why) so this can be handed to CAMPING later if ever needed,
 * but seeds at NONE for CAMPING/PARTENAIRE, matching the ADMIN-only intent
 * already stated above and today's actual behavior exactly.
 */
@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    @GetMapping("/calendar")
    @PreAuthorize("@perm.can('AVAILABILITY', 'READ')")
    public ResponseEntity<List<AvailabilityDayResponse>> getCalendar(
            @RequestParam UUID tourTypeId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return ResponseEntity.ok(availabilityService.getCalendar(tourTypeId, month));
    }

    @PostMapping("/blocks")
    @PreAuthorize("@perm.can('AVAILABILITY', 'FULL')")
    public ResponseEntity<AvailabilityBlockResponse> createBlock(@Valid @RequestBody AvailabilityBlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(availabilityService.createBlock(request));
    }

    @DeleteMapping("/blocks/{blockId}")
    @PreAuthorize("@perm.can('AVAILABILITY', 'FULL')")
    public ResponseEntity<Void> deleteBlock(@PathVariable UUID blockId) {
        availabilityService.deleteBlock(blockId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/external-bookings")
    @PreAuthorize("@perm.can('AVAILABILITY', 'FULL')")
    public ResponseEntity<ExternalAccommodationBookingResponse> createExternalBooking(
            @Valid @RequestBody ExternalAccommodationBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(availabilityService.createExternalBooking(request));
    }

    @DeleteMapping("/external-bookings/{bookingId}")
    @PreAuthorize("@perm.can('AVAILABILITY', 'FULL')")
    public ResponseEntity<Void> deleteExternalBooking(@PathVariable UUID bookingId) {
        availabilityService.deleteExternalBooking(bookingId);
        return ResponseEntity.noContent().build();
    }
}
