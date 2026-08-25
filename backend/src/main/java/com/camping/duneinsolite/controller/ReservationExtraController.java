package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.response.ReservationExtraResponse;
import com.camping.duneinsolite.dto.response.ReservationExtrasListResponse;
import com.camping.duneinsolite.service.ReservationExtraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reservation-extras")
@RequiredArgsConstructor
public class ReservationExtraController {

    private final ReservationExtraService reservationExtraService;
// add extra to an exist rservation scenario2 make extra in teh camping
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING','CLIENT','PARTENAIRE')")
    public ResponseEntity<ReservationExtraResponse> createExtra(
            @Valid @RequestBody ReservationExtraRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationExtraService.createExtra(request));
    }

    @GetMapping("/{extraId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservationExtraResponse> getExtraById(@PathVariable UUID extraId) {
        return ResponseEntity.ok(reservationExtraService.getExtraById(extraId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<List<ReservationExtraResponse>> getAllExtras() {
        return ResponseEntity.ok(reservationExtraService.getAllExtras());
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservationExtrasListResponse> getExtrasByReservation(
            @PathVariable UUID reservationId) {
        return ResponseEntity.ok(reservationExtraService.getExtrasByReservation(reservationId));
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReservationExtraResponse>> getActiveExtras() {
        return ResponseEntity.ok(reservationExtraService.getActiveExtras());
    }

    @PutMapping("/{extraId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<ReservationExtraResponse> updateExtra(
            @PathVariable UUID extraId,
            @Valid @RequestBody ReservationExtraRequest request) {
        return ResponseEntity.ok(reservationExtraService.updateExtra(extraId, request));
    }

    @DeleteMapping("/{extraId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")  // ← add CAMPING
    public ResponseEntity<Void> deleteExtra(@PathVariable UUID extraId) {
        reservationExtraService.deleteExtra(extraId);
        return ResponseEntity.noContent().build();
    }
}