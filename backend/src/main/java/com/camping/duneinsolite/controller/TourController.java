package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.service.TourService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tours")
@RequiredArgsConstructor
public class TourController {

    private final TourService tourService;

    // ADMIN-only today (no CAMPING mix, unlike TourType/Extra below), so this
    // conversion is behavior-preserving: CAMPING/PARTENAIRE seed at NONE.
    @PostMapping
    @PreAuthorize("@perm.can('TOURS', 'FULL')")
    public ResponseEntity<TourResponse> createTour(@Valid @RequestBody TourRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tourService.createTour(request));
    }

    @GetMapping("/{tourId}")
    public ResponseEntity<TourResponse> getTourById(@PathVariable UUID tourId) {
        return ResponseEntity.ok(tourService.getTourById(tourId));
    }

    @GetMapping
    public ResponseEntity<List<TourResponse>> getAllTours() {
        return ResponseEntity.ok(tourService.getAllTours());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TourResponse>> getActiveTours() {
        return ResponseEntity.ok(tourService.getActiveTours());
    }

    @PutMapping("/{tourId}")
    @PreAuthorize("@perm.can('TOURS', 'EDIT')")
    public ResponseEntity<TourResponse> updateTour(
            @PathVariable UUID tourId,
            @Valid @RequestBody TourUpdateRequest request) {
        return ResponseEntity.ok(tourService.updateTour(tourId, request));
    }

    @DeleteMapping("/{tourId}")
    @PreAuthorize("@perm.can('TOURS', 'FULL')")
    public ResponseEntity<Void> deleteTour(@PathVariable UUID tourId) {
        tourService.deleteTour(tourId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{tourId}/deactivate")
    @PreAuthorize("@perm.can('TOURS', 'EDIT')")
    public ResponseEntity<TourResponse> deactivateTour(@PathVariable UUID tourId) {
        return ResponseEntity.ok(tourService.deactivateTour(tourId));
    }
}