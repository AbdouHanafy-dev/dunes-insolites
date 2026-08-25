package com.camping.duneinsolite.controller;


import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import com.camping.duneinsolite.service.TourTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tour-types")
@RequiredArgsConstructor
public class TourTypeController {

    private final TourTypeService tourTypeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<TourTypeResponse> createTourType(@Valid @RequestBody TourTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tourTypeService.createTourType(request));
    }

    @GetMapping("/{tourTypeId}")
    public ResponseEntity<TourTypeResponse> getTourTypeById(@PathVariable UUID tourTypeId) {
        return ResponseEntity.ok(tourTypeService.getTourTypeById(tourTypeId));
    }

    @GetMapping
    public ResponseEntity<List<TourTypeResponse>> getAllTourTypes() {
        return ResponseEntity.ok(tourTypeService.getAllTourTypes());
    }

    @PutMapping("/{tourTypeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<TourTypeResponse> updateTourType(@PathVariable UUID tourTypeId,
                                                           @Valid @RequestBody TourTypeRequest request) {
        return ResponseEntity.ok(tourTypeService.updateTourType(tourTypeId, request));
    }

    @DeleteMapping("/{tourTypeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTourType(@PathVariable UUID tourTypeId) {
        tourTypeService.deleteTourType(tourTypeId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{tourTypeId}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TourTypeResponse> deactivateTourType(@PathVariable UUID tourTypeId) {
        return ResponseEntity.ok(tourTypeService.deactivateTourType(tourTypeId));
    }
}
